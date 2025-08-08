const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Workspace = require('../models/Workspace');
const User = require('../models/User'); // Assuming you have a User model
const { calculateCreditBalance } = require('./creditService'); 

// --- Helper Function ---

// Finds workspace and verifies user has access (is owner)
// TODO: Extend access check to members if needed based on roles
const findAndVerifyWorkspace = async (workspaceId, userId) => {
  if (!workspaceId || !userId) {
    throw new Error('Workspace ID and User ID are required.');
  }
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found.');
  }
  // Simple check: only owner can manage billing for now
  if (workspace.user.toString() !== userId.toString()) {
    // If you want members to manage billing, adjust this logic:
    // const isMember = workspace.members.some(member => member.user.toString() === userId.toString() && member.role === 'admin'); // Example check
    // if (!isMember) {
    throw new Error('User does not have permission to manage billing for this workspace.');
    // }
  }
  return workspace;
};

// --- Route Handlers ---

const handleCreateCheckoutSession = async (req, res) => {
  const { priceId, workspaceId } = req.body;
  const userId = req.user.id;

  console.log(`User ${userId} requesting checkout for workspace ${workspaceId} with price ${priceId}`);

  if (!priceId) {
    return res.status(400).json({ message: 'Price ID is required.' });
  }

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    let stripeCustomerId = workspace.stripeCustomerId;

    // 1. Get or create the Stripe Customer ID
    if (!stripeCustomerId) {
      // Fetch user email to create Stripe customer
      const user = await User.findById(userId);
      if (!user || !user.email) {
         console.error(`User not found or email missing for ID: ${userId}`);
         return res.status(400).json({ message: 'User email not found for Stripe customer creation.' });
      }

      console.log(`Creating Stripe customer for user ${user.email} and workspace ${workspace._id}`);
      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace.name, // Optional: Add workspace name to Stripe customer
        metadata: {
          workspaceId: workspace._id.toString(),
          userId: userId.toString(),
        },
      });
      stripeCustomerId = customer.id;
      workspace.stripeCustomerId = stripeCustomerId;
      await workspace.save();
      console.log(`Stripe customer created: ${stripeCustomerId}`);
    } else {
        console.log(`Using existing Stripe customer: ${stripeCustomerId}`);
    }

    // 2. Create a Stripe Checkout Session
    const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/dashboard?success=true'; // Define fallback defaults
    const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/dashboard?canceled=true';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`, // Pass session ID back
      cancel_url: cancelUrl,
      // Add metadata to session if needed, though customer link is usually enough
      // metadata: { workspaceId: workspaceId },
      // client_reference_id can also be useful if you don't have customer metadata set up
       client_reference_id: workspaceId.toString(),
       // Enable trial periods if the price ID has one configured in Stripe
       subscription_data: {
           trial_from_plan: true,
       }
    });

    console.log(`Stripe checkout session created: ${session.id}`);

    // 3. Return the session ID to the frontend
    res.json({ sessionId: session.id });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: `Failed to create checkout session: ${error.message}` });
  }
};

const handleCreatePortalSession = async (req, res) => {
  const { workspaceId } = req.body;
  const userId = req.user.id;

  console.log(`User ${userId} requesting billing portal for workspace ${workspaceId}`);

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    // 1. Get the stripeCustomerId
    const stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
      console.error(`Workspace ${workspaceId} does not have a Stripe customer ID.`);
      return res.status(400).json({ message: 'Billing is not set up for this workspace.' });
    }

    // 2. Create a Stripe Billing Portal Session
    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || 'http://localhost:3000/settings/billing'; // Define fallback default

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    console.log(`Stripe portal session created for customer ${stripeCustomerId}`);

    // 3. Return the session URL to the frontend
    res.json({ url: portalSession.url });

  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ message: `Failed to create portal session: ${error.message}` });
  }
};

// --- Payment Method Management ---

/**
 * Creates a Setup Intent for adding a payment method without charging
 */
const handleCreateSetupIntent = async (req, res) => {
  const { workspaceId } = req.body;
  const userId = req.user.id;

  console.log(`User ${userId} requesting setup intent for workspace ${workspaceId}`);

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    let stripeCustomerId = workspace.stripeCustomerId;

    // 1. Get or create the Stripe Customer ID
    if (!stripeCustomerId) {
      // Fetch user email to create Stripe customer
      const user = await User.findById(userId);
      if (!user || !user.email) {
         console.error(`User not found or email missing for ID: ${userId}`);
         return res.status(400).json({ message: 'User email not found for Stripe customer creation.' });
      }

      console.log(`Creating Stripe customer for user ${user.email} and workspace ${workspace._id}`);
      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace.name,
        metadata: {
          workspaceId: workspace._id.toString(),
          userId: userId.toString(),
        },
      });
      stripeCustomerId = customer.id;
      workspace.stripeCustomerId = stripeCustomerId;
      await workspace.save();
      console.log(`Stripe customer created: ${stripeCustomerId}`);
    } else {
        console.log(`Using existing Stripe customer: ${stripeCustomerId}`);
    }

    // 2. Create a Setup Intent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Important: allows using this payment method for future payments without customer present
      metadata: {
        workspaceId: workspaceId.toString()
      }
    });

    console.log(`Stripe setup intent created: ${setupIntent.id}`);

    // 3. Return the client secret to the frontend
    res.json({ 
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });

  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ message: `Failed to create setup intent: ${error.message}` });
  }
};

/**
 * Gets all saved payment methods for a customer
 */
const handleGetPaymentMethods = async (req, res) => {
  const { workspaceId } = req.query;
  const userId = req.user.id;

  console.log(`User ${userId} requesting payment methods for workspace ${workspaceId}`);

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    // Get the stripeCustomerId
    const stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
      console.log(`Workspace ${workspaceId} has no Stripe customer ID. Returning empty payment methods list.`);
      return res.json([]); // No customer, no payment methods
    }

    // List payment methods from Stripe
    console.log(`Fetching payment methods for Stripe customer ${stripeCustomerId}`);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card', // Only get cards
    });

    // Format and return the payment methods
    const formattedPaymentMethods = paymentMethods.data.map(method => ({
      id: method.id,
      brand: method.card.brand,
      last4: method.card.last4,
      expMonth: method.card.exp_month,
      expYear: method.card.exp_year,
      isDefault: method.metadata.isDefault === 'true', // If you mark default payment methods with metadata
      billingDetails: {
        name: method.billing_details.name,
        email: method.billing_details.email,
        phone: method.billing_details.phone,
        address: method.billing_details.address ? {
          line1: method.billing_details.address.line1,
          line2: method.billing_details.address.line2,
          city: method.billing_details.address.city,
          state: method.billing_details.address.state,
          postalCode: method.billing_details.address.postal_code,
          country: method.billing_details.address.country,
        } : null
      }
    }));

    res.json(formattedPaymentMethods);

  } catch (error) {
    console.error('Error retrieving payment methods:', error);
    res.status(500).json({ message: `Failed to retrieve payment methods: ${error.message}` });
  }
};

/**
 * Deletes a payment method
 */
const handleDeletePaymentMethod = async (req, res) => {
  const { paymentMethodId, workspaceId } = req.body;
  const userId = req.user.id;

  console.log(`User ${userId} requesting to delete payment method ${paymentMethodId} for workspace ${workspaceId}`);

  if (!paymentMethodId) {
    return res.status(400).json({ message: 'Payment method ID is required.' });
  }

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    // Get the stripeCustomerId
    const stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
      return res.status(400).json({ message: 'Workspace does not have a Stripe customer ID.' });
    }

    // Verify this payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (!paymentMethod || paymentMethod.customer !== stripeCustomerId) {
      return res.status(403).json({ message: 'Payment method does not belong to this workspace.' });
    }

    // Check if this is the default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const isDefault = customer.invoice_settings?.default_payment_method === paymentMethodId;

    if (isDefault) {
      // This is the default payment method - check if there are other payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });

      if (paymentMethods.data.length <= 1) {
        // This is the only payment method, check if there are active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
        });

        if (subscriptions.data.length > 0) {
          return res.status(400).json({
            message: 'Cannot delete the only payment method while you have an active subscription.'
          });
        }
      } else {
        // There are other payment methods, set a different one as default
        const newDefault = paymentMethods.data.find(pm => pm.id !== paymentMethodId);
        if (newDefault) {
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: newDefault.id
            }
          });
          
          // Update the metadata to mark the new default
          await stripe.paymentMethods.update(newDefault.id, {
            metadata: { isDefault: 'true' }
          });
          console.log(`Set payment method ${newDefault.id} as the new default for customer ${stripeCustomerId}`);
        }
      }
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);
    console.log(`Detached payment method ${paymentMethodId} from customer ${stripeCustomerId}`);

    res.json({ success: true });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: `Failed to delete payment method: ${error.message}` });
  }
};

/**
 * Sets a payment method as default
 */
const handleSetDefaultPaymentMethod = async (req, res) => {
  const { paymentMethodId, workspaceId } = req.body;
  const userId = req.user.id;

  console.log(`User ${userId} requesting to set payment method ${paymentMethodId} as default for workspace ${workspaceId}`);

  if (!paymentMethodId) {
    return res.status(400).json({ message: 'Payment method ID is required.' });
  }

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    // Get the stripeCustomerId
    const stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
      return res.status(400).json({ message: 'Workspace does not have a Stripe customer ID.' });
    }

    // Verify this payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (!paymentMethod || paymentMethod.customer !== stripeCustomerId) {
      return res.status(403).json({ message: 'Payment method does not belong to this workspace.' });
    }

    // Get the current default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const currentDefault = customer.invoice_settings?.default_payment_method;

    // If the requested payment method is already the default, just return success
    if (currentDefault === paymentMethodId) {
      return res.json({ success: true, alreadyDefault: true });
    }

    // Update customer with new default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    // Update metadata for the new default
    await stripe.paymentMethods.update(paymentMethodId, {
      metadata: { isDefault: 'true' }
    });
    
    // If there was a previous default, update its metadata
    if (currentDefault) {
      await stripe.paymentMethods.update(currentDefault, {
        metadata: { isDefault: 'false' }
      });
    }
    
    console.log(`Set payment method ${paymentMethodId} as default for customer ${stripeCustomerId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ message: `Failed to set default payment method: ${error.message}` });
  }
};

// --- One-Time Payments ---

/**
 * Creates a Payment Intent for collecting payment details via frontend Elements
 */
const handleCreatePaymentIntent = async (req, res) => {
  const { amount, currency = 'usd', workspaceId, intentType, description: piDescription } = req.body; // Amount should be in the smallest currency unit (e.g., cents)
  const userId = req.user.id;

  console.log(`User ${userId} creating PaymentIntent for ${amount} ${currency} in workspace ${workspaceId}. IntentType: ${intentType || 'N/A'}`);

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required.' });
  }
  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace ID is required.' });
  }

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    // Ensure customer exists, or create one
    let stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
        const user = await User.findById(userId);
        if (!user || !user.email) {
           console.error(`User not found or email missing for ID: ${userId} during PaymentIntent creation.`);
           return res.status(400).json({ message: 'User email not found for Stripe customer creation.' });
        }
        console.log(`Creating Stripe customer for user ${user.email} and workspace ${workspace._id} during PaymentIntent creation.`);
        const customer = await stripe.customers.create({
          email: user.email,
          name: workspace.name, // Optional: Add workspace name to Stripe customer
          metadata: {
            workspaceId: workspace._id.toString(),
            userId: userId.toString(),
          },
        });
        stripeCustomerId = customer.id;
        workspace.stripeCustomerId = stripeCustomerId;
        await workspace.save();
        console.log(`Stripe customer created: ${stripeCustomerId} for workspace ${workspaceId}`);
    } else {
        console.log(`Using existing Stripe customer: ${stripeCustomerId} for workspace ${workspaceId}`);
    }

    // Create a Payment Intent
    const paymentIntentParams = {
      amount: Math.round(amount), // Ensure integer value
      currency: currency,
      customer: stripeCustomerId,
      setup_future_usage: 'off_session', // Save the payment method for future off-session use
      automatic_payment_methods: { enabled: true }, // Stripe manages payment method types
      metadata: {
        workspaceId: workspaceId.toString(),
        userId: userId.toString(),
      },
    };

    if (intentType) {
      paymentIntentParams.metadata.intentType = intentType;
    }
    if (piDescription) { // Add description to Payment Intent if provided
      paymentIntentParams.description = piDescription;
    }

    console.log(intentType, paymentIntentParams, "just payment Intent params");

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`Payment Intent created: ${paymentIntent.id}`);

    // Return the client secret and Payment Intent ID to the frontend
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating Payment Intent:', error);
    res.status(500).json({ message: `Failed to create Payment Intent: ${error.message}` });
  }
};

/**
 * Charges a specific saved payment method for a one-time purchase.
 * Assumes the payment method is already attached to the customer.
 */
const handleChargeWithSavedMethod = async (req, res) => {
  const { amount, currency = 'usd', paymentMethodId, workspaceId, description } = req.body;
  const userId = req.user.id;

  console.log(`User ${userId} attempting charge of ${amount} ${currency} on payment method ${paymentMethodId} for workspace ${workspaceId}`);

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required.' });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ message: 'Payment Method ID is required.' });
  }
  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace ID is required.' });
  }

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);
    const stripeCustomerId = workspace.stripeCustomerId;

    if (!stripeCustomerId) {
      console.error(`Workspace ${workspaceId} does not have a Stripe customer ID.`);
      return res.status(400).json({ message: 'Billing customer not found for this workspace.' });
    }

    // Verify the payment method belongs to the customer (optional but recommended)
    try {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (pm.customer !== stripeCustomerId) {
        return res.status(403).json({ message: 'Payment method does not belong to this workspace.' });
      }
    } catch (pmError) {
       console.error("Error retrieving payment method for verification:", pmError);
       return res.status(400).json({ message: 'Invalid Payment Method ID.' });
    }

    // Create and confirm a Payment Intent immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency,
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true, // Indicate the customer is not present during the transaction
      confirm: true,     // Attempt to confirm the payment immediately
      description: description || `One-time charge for workspace ${workspaceId}`,
      metadata: {
        workspaceId: workspaceId.toString(),
        userId: userId.toString(),
      },
    });

    console.log(`Payment Intent created and confirmed (or requires action): ${paymentIntent.id}, Status: ${paymentIntent.status}`);

    // Handle different outcomes
    if (paymentIntent.status === 'succeeded') {
      res.json({ success: true, paymentIntentId: paymentIntent.id, status: paymentIntent.status });
    } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_source_action') {
      // Needs further customer action (e.g., 3D Secure)
      // You might need to handle this differently on the frontend if using this endpoint directly
      res.status(402).json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret, // Send back client secret for frontend handling
        status: paymentIntent.status,
        message: 'Payment requires further authentication.'
      });
    } else {
      // Other statuses like requires_payment_method, requires_capture, processing, canceled
      res.status(400).json({
        success: false,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        message: 'Payment failed or requires different handling.'
      });
    }

  } catch (error) {
    console.error('Error processing charge:', error);
    // Handle specific Stripe errors if needed (e.g., card errors)
    res.status(500).json({ message: `Failed to process charge: ${error.message}` });
  }
};

// --- Subscription Initiation with Elements ---

/**
 * Creates a Payment Intent configured to save the card and potentially start a subscription.
 * The actual subscription is created via webhook after payment_intent.succeeded.
 */
const handlePrepareSubscriptionIntent = async (req, res) => {
  const { priceId, workspaceId } = req.body;
  const userId = req.user.id;

  console.log(`User ${userId} preparing subscription intent for price ${priceId} in workspace ${workspaceId}`);

  if (!priceId) {
    return res.status(400).json({ message: 'Price ID is required.' });
  }
  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace ID is required.' });
  }

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId);

    // 1. Ensure customer exists
    let stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
      const user = await User.findById(userId);
      if (!user || !user.email) {
         console.error(`User not found or email missing for ID: ${userId}`);
         return res.status(400).json({ message: 'User email not found for Stripe customer creation.' });
      }
      console.log(`Creating Stripe customer for user ${user.email} during subscription intent preparation.`);
      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace.name,
        metadata: { workspaceId: workspace._id.toString(), userId: userId.toString() },
      });
      stripeCustomerId = customer.id;

      console.log(`Stripe customer created: ${stripeCustomerId}, Saving to the workspace ${workspaceId}`);
      workspace.stripeCustomerId = stripeCustomerId;
      await workspace.save();
      console.log(`Stripe customer created: ${stripeCustomerId}`);
    } else {
       console.log(`Using existing Stripe customer: ${stripeCustomerId}`);
    }

    // 2. Retrieve price details to determine initial amount (handle trials)
    // You might need more robust price checking depending on your product structure
    let initialAmount = 0; // Default to 0 (e.g., for free trials)
    let currency = 'usd'; // Default currency
    try {
       const price = await stripe.prices.retrieve(priceId);
       currency = price.currency;
       // If the price has a trial period defined in Stripe, the first charge might be $0
       // Or if the plan is free initially. For simplicity, we check the amount.
       if (price.unit_amount > 0) {
           initialAmount = price.unit_amount; // Use price amount if > 0
       } else {
           console.log(`Price ${priceId} has amount 0 or null, assuming trial or free tier start.`);
       }
    } catch (priceError) {
        console.error(`Failed to retrieve price ${priceId}:`, priceError);
        return res.status(400).json({ message: `Invalid Price ID: ${priceError.message}` });
    }

    // 3. Create the Payment Intent
    const paymentIntentParams = {
        amount: initialAmount,
        currency: currency,
        customer: stripeCustomerId,
        setup_future_usage: 'off_session', // IMPORTANT: To save the card for the subscription
        automatic_payment_methods: { enabled: true },
        metadata: {
            workspaceId: workspaceId.toString(),
            userId: userId.toString(),
            priceId: priceId, // Store priceId to create subscription in webhook
            intentType: 'subscription_setup' // Custom flag to identify in webhook
        },
    };

    // If amount is 0 (free trial), we don't need payment confirmation, but still create intent to save card
    if(initialAmount === 0) {
      // For $0 trials, confirmation isn't strictly necessary for payment,
      // but confirming saves the card details immediately. We will confirm on the client-side.
       console.log("Creating $0 Payment Intent to save card for trial subscription.");
    } else {
       console.log(`Creating Payment Intent for ${initialAmount} ${currency} to start subscription.`);
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`Subscription Payment Intent created: ${paymentIntent.id}`);

    // 4. Return the client secret to the frontend
    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error('Error preparing subscription intent:', error);
    res.status(500).json({ message: `Failed to prepare subscription: ${error.message}` });
  }
};

// --- Subscription Status Check ---

/**
 * Checks if a workspace has an active (or trialing) subscription.
 * Used for polling after initiating a subscription.
 */
const handleGetSubscriptionStatus = async (req, res) => {
  const { workspaceId } = req.query;
  const userId = req.user.id;

  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace ID is required.' });
  }

  console.log(`User ${userId} checking subscription status for workspace ${workspaceId}`);

  try {
    const workspace = await Workspace.findById(workspaceId);

    // Verify workspace exists and user has access (could reuse findAndVerifyWorkspace if needed, 
    // but checking basic access is sufficient here as we aren't modifying billing directly)
    if (!workspace) {
        console.log(`Subscription status check: Workspace ${workspaceId} not found.`);
        // Respond with 404 as requested by frontend dev spec
        return res.status(404).json({ message: "Workspace not found" });
    }
    const isOwner = workspace.user.toString() === userId.toString();
    const isMember = workspace.members.some(member => member.user.toString() === userId.toString());
    if (!isOwner && !isMember) {
        return res.status(403).json({ error: "Not authorized to access this workspace" });
    }

    // Check status stored in our DB first (quick check)
    const localStatus = workspace.subscriptionStatus;
    const isActiveLocally = localStatus === 'active' || localStatus === 'trialing';

    // Optional: For higher accuracy, verify with Stripe, especially if polling soon after creation
    // This adds latency but confirms the absolute latest status from Stripe.
    // Let's add a flag to control this, defaulting to false for faster checks.
    const verifyWithStripe = req.query.verifyWithStripe === 'true';

    if (!verifyWithStripe) {
         console.log(`Subscription status check (local): Workspace ${workspaceId}, Status: ${localStatus}, isActive: ${isActiveLocally}`);
         return res.json({ isActive: isActiveLocally });
    }
    
    // --- Verification with Stripe --- 
    console.log(`Subscription status check (verifying with Stripe): Workspace ${workspaceId}`);
    const stripeCustomerId = workspace.stripeCustomerId;
    const stripeSubscriptionId = workspace.stripeSubscriptionId;

    if (!stripeCustomerId || !stripeSubscriptionId) {
        console.log(`Subscription status check (Stripe): Workspace ${workspaceId} missing Stripe customer or subscription ID.`);
        // Aligning with spec: return false if no subscription record exists yet
        return res.json({ isActive: false });
    }

    try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const stripeStatus = subscription.status;
        const isActiveInStripe = stripeStatus === 'active' || stripeStatus === 'trialing';
        
        console.log(`Subscription status check (Stripe): Workspace ${workspaceId}, Sub ID: ${stripeSubscriptionId}, Stripe Status: ${stripeStatus}, isActive: ${isActiveInStripe}`);

        // Optional: Update local DB if status mismatch is detected (outside scope of this endpoint's primary function)
        // if (localStatus !== stripeStatus) { ... } 

        res.json({ isActive: isActiveInStripe });

    } catch (stripeError) {
        // Handle cases where the subscription ID might be invalid or not found in Stripe
        if (stripeError.code === 'resource_missing') {
            console.warn(`Subscription status check (Stripe): Subscription ${stripeSubscriptionId} not found in Stripe for workspace ${workspaceId}.`);
            return res.json({ isActive: false });
        }
        console.error(`Subscription status check (Stripe Error): Failed to retrieve subscription ${stripeSubscriptionId}`, stripeError);
        // Return local status as fallback on Stripe error?
        // Or return error? Let's return false as it's not definitively active.
        res.status(500).json({ message: `Failed to verify subscription status with Stripe: ${stripeError.message}` });
    }

  } catch (error) {
    // Handle errors like database connection issues or workspace lookup failures
    console.error('Error checking subscription status:', error);
    res.status(500).json({ message: `Failed to check subscription status: ${error.message}` });
  }
};

// --- Get Plan Details (Subscription or PAYG) ---

/**
 * Retrieves details about the current billing plan (Subscription or PAYG)
 * and credit balance for a workspace.
 */
const handleGetPlanDetails = async (req, res) => {
    const { workspaceId } = req.query;
    const userId = req.user.id;

    if (!workspaceId) {
        return res.status(400).json({ message: 'Workspace ID is required.' });
    }

    console.log(`User ${userId} getting plan details for workspace ${workspaceId}`);

    try {
        // Verify workspace and user access
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }
        const isOwner = workspace.user.toString() === userId.toString();
        const isMember = workspace.members.some(member => member.user.toString() === userId.toString());
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: "Not authorized to access this workspace" });
        }

        // --- Calculate Current Credit Balance --- 
        let creditInfo = {}; 
        try {
            // Assuming calculateCreditBalance returns an object like { balance: 123, nextReset: date } or similar
            creditInfo = await calculateCreditBalance(workspace);
            console.log(`Credit balance for workspace ${workspaceId}:`, creditInfo);
        } catch (creditError) {
            console.error(`Error calculating credit balance for workspace ${workspaceId}:`, creditError);
            // Decide how to handle credit calculation errors (e.g., return defaults or error)
            creditInfo = { balance: 0, error: 'Failed to calculate balance' }; 
        }

        // --- Initialize response with Free Plan defaults --- 
        let response = {
            planType: 'free', 
            isActive: false, 
            status: 'free',
            planName: 'Free Plan',
            creditInfo: creditInfo, 
            autoRecharge: {
                autoRechargeEnabled: false,
                autoRechargeThresholdCredits: workspace.autoRechargeThresholdCredits,
                autoRechargeAmountToAddCredits: workspace.autoRechargeAmountToAddCredits,
                autoRechargeChargeAmount: workspace.autoRechargeChargeAmount,
                autoRechargeCurrency: workspace.autoRechargeCurrency,
            },
            priceId: null,
            interval: null,
            amount: null,
            currency: null,
            startDate: null,
            nextBillingDate: null,
            trialEndDate: null,
            cancelAtPeriodEnd: null,
        };

        // --- Check for Active Subscription (Highest Priority) --- 
        const stripeSubscriptionId = workspace.stripeSubscriptionId;
        const isSubscribedAndActive = stripeSubscriptionId && 
                                    ['active', 'trialing', 'past_due', 'incomplete'].includes(workspace.subscriptionStatus);

        if (isSubscribedAndActive) {
            console.log(`Workspace ${workspaceId} has active subscription ${stripeSubscriptionId}. Fetching details...`);
            response.planType = 'subscription'; // Override plan type

            try {
                // Retrieve the subscription from Stripe
                const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
                    expand: ['plan.product', 'latest_invoice']
                });

                const status = subscription.status;
                const isActive = status === 'active' || status === 'trialing';
                const plan = subscription.plan;
                const product = plan?.product;
                const firstItem = subscription.items?.data[0];
                const nextBillingTimestamp = firstItem?.current_period_end;
                const nextBillingDate = nextBillingTimestamp ? new Date(nextBillingTimestamp * 1000) : null;

                // Override response fields with subscription details
                response.isActive = isActive;
                response.status = status;
                response.planName = product?.name || 'Unknown Plan';
                response.priceId = plan?.id || null;
                response.interval = plan?.interval || null;
                response.amount = plan?.amount || 0;
                response.currency = plan?.currency || null;
                response.startDate = subscription.start_date ? new Date(subscription.start_date * 1000) : null;
                response.nextBillingDate = nextBillingDate;
                response.trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
                response.cancelAtPeriodEnd = subscription.cancel_at_period_end;
                // Clear PAYG specific fields if subscribed
                response.autoRecharge.autoRechargeEnabled = false; // Ensure PAYG is marked disabled

            } catch (stripeError) {
                if (stripeError.code === 'resource_missing') {
                    console.warn(`Stripe Error: Subscription ${stripeSubscriptionId} (from DB) not found for workspace ${workspaceId}.`);
                    // If sub ID exists in DB but not Stripe, treat as inactive/error state
                    response.status = 'error_fetching_stripe';
                    response.isActive = false;
                    response.planName = 'Error - Subscription Not Found';
                    // Keep planType as subscription, but mark inactive
                } else {
                    console.error(`Stripe Error: Failed to retrieve subscription ${stripeSubscriptionId}:`, stripeError);
                    // Handle other Stripe errors - maybe return partial data or an error status
                    response.status = 'error_fetching_stripe';
                    response.isActive = false;
                    response.planName = 'Error Fetching Details';
                }
            }
        }
        // --- Else, Check for Pay As You Go (Enabled Auto-Recharge) --- 
        else if (workspace.autoRechargeEnabled) {
            console.log(`Workspace ${workspaceId} is on Pay As You Go (Auto-Recharge Enabled).`);
            response.planType = 'pay_as_you_go';
            response.planName = 'Pay As You Go';
            response.status = 'active'; 
            response.isActive = true;
            // Update autoRecharge details from workspace model
            response.autoRecharge = {
                autoRechargeEnabled: workspace.autoRechargeEnabled,
                autoRechargeThresholdCredits: workspace.autoRechargeThresholdCredits,
                autoRechargeAmountToAddCredits: workspace.autoRechargeAmountToAddCredits,
                autoRechargeChargeAmount: workspace.autoRechargeChargeAmount,
                autoRechargeCurrency: workspace.autoRechargeCurrency,
            };

            // --- Calculate Monetary Value of Used PAYG Credits --- START ---
            let paygUsageValue = { usedCredits: 0, value: 0, currency: response.autoRecharge.autoRechargeCurrency };
            try {
                // Sum credits specifically from 'top-up' source
                const totalTopUpCredits = workspace.oneTimeCredits
                    .filter(credit => credit.source === 'top-up')
                    .reduce((sum, credit) => sum + (credit.amount || 0), 0);
                
                const currentBalance = creditInfo?.totalRemainingCredits ?? 0; // Use totalRemainingCredits
                const creditsUsed = Math.max(0, totalTopUpCredits - currentBalance); // Don't show negative usage
                
                let costPerCredit = 0;
                if (response.autoRecharge.autoRechargeAmountToAddCredits > 0) {
                    costPerCredit = response.autoRecharge.autoRechargeChargeAmount / response.autoRecharge.autoRechargeAmountToAddCredits;
                }
                
                const monetaryValueUsed = Math.round(creditsUsed * costPerCredit); // Keep in smallest unit

                paygUsageValue = {
                    usedCredits: creditsUsed,
                    value: monetaryValueUsed, // Value in smallest currency unit (e.g., cents)
                    currency: response.autoRecharge.autoRechargeCurrency
                };
                console.log(`PAYG Usage for ${workspaceId}:`, paygUsageValue);
            } catch (usageError) {
                console.error(`Error calculating PAYG usage value for ${workspaceId}:`, usageError);
                // Keep default usage value (0) if calculation fails
            }
            response.paygUsageValue = paygUsageValue;
            // --- Calculate Monetary Value of Used PAYG Credits --- END ---
        } 
        // --- Else, it's potentially a Free Plan (Check for Credits) --- 
        else {
            // Check the calculated *total remaining* balance which accounts for expiry
            const currentBalance = creditInfo?.totalRemainingCredits ?? 0; // *** Use totalRemainingCredits ***
            if (currentBalance > 0) {
                // Has active credits, no subscription, no PAYG
                console.log(`Workspace ${workspaceId} is Free Plan with active credits (${currentBalance}).`);
                response.planType = 'free_with_credits'; 
                response.planName = 'Free Plan (Credits)';
                // isActive and status remain false / 'free'
            } else {
                // No active credits, no subscription, no PAYG
                console.log(`Workspace ${workspaceId} is Free Plan with zero active credits.`);
                // The response is already initialized with Free Plan defaults.
            }
            // Ensure PAYG is marked disabled regardless
            response.autoRecharge.autoRechargeEnabled = false;
        }

        res.json(response);

    } catch (error) {
        console.error('Error getting plan details:', error);
        res.status(500).json({ message: `Failed to get plan details: ${error.message}` });
    }
};

// --- Invoice Handling ---

/**
 * Retrieves a paginated list of invoices for a workspace.
 */
const handleGetPaginatedInvoices = async (req, res) => {
    const { workspaceId, limit = '10', starting_after } = req.query;
    const userId = req.user.id;

    if (!workspaceId) {
        return res.status(400).json({ message: 'Workspace ID is required.' });
    }

    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) { // Stripe limit is 1-100
        return res.status(400).json({ message: 'Invalid limit parameter. Must be between 1 and 100.' });
    }

    console.log(`User ${userId} requesting invoices for workspace ${workspaceId}. Limit: ${parsedLimit}, Starting After: ${starting_after || ''}`);

    try {
        // Verify workspace and user access
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" });
        }
        const isOwner = workspace.user.toString() === userId.toString();
        const isMember = workspace.members.some(member => member.user.toString() === userId.toString());
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: "Not authorized to access this workspace" });
        }

        // Check if there is a Stripe Customer ID
        const stripeCustomerId = workspace.stripeCustomerId;
        if (!stripeCustomerId) {
            console.log(`Workspace ${workspaceId} has no Stripe customer ID. Returning empty invoice list.`);
            // Return empty list if no customer
            return res.json({
                invoices: [],
                has_more: false,
                next_page_token: null
            });
        }

        try {
            // Prepare parameters for Stripe API call
            const listParams = {
                customer: stripeCustomerId,
                limit: parsedLimit,
            };
            if (starting_after) {
                listParams.starting_after = starting_after;
            }

            // Retrieve the list of invoices from Stripe
            const invoiceList = await stripe.invoices.list(listParams);

            // Format the invoices for the response
            const formattedInvoices = invoiceList.data.map(invoice => ({
                id: invoice.id,
                created: invoice.created,
                paid: invoice.paid,
                status: invoice.status,
                amount_due: invoice.amount_due / 100, // Format amount
                amount_paid: invoice.amount_paid / 100,
                amount_remaining: invoice.amount_remaining / 100,
                currency: invoice.currency,
                hosted_invoice_url: invoice.hosted_invoice_url, // Link to Stripe hosted invoice page
                invoice_pdf: invoice.invoice_pdf, // Link to download PDF
                // Add other relevant fields as needed
                // e.g., subscription: invoice.subscription
            }));

            // Determine the token for the next page
            const nextPageToken = invoiceList.has_more && formattedInvoices.length > 0
                ? formattedInvoices[formattedInvoices.length - 1].id
                : null;

            // Send the paginated response
            res.json({
                invoices: formattedInvoices,
                has_more: invoiceList.has_more,
                next_page_token: nextPageToken // Use the ID of the last invoice as the starting_after token for the next request
            });

        } catch (stripeError) {
            console.error(`Stripe Error: Failed to list invoices for customer ${stripeCustomerId}:`, stripeError);
            res.status(500).json({ message: `Failed to get invoices from Stripe: ${stripeError.message}` });
        }

    } catch (error) {
        console.error('Error getting invoices:', error);
        res.status(500).json({ message: `Failed to get invoices: ${error.message}` });
    }
};

// --- Webhook Handler ---

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    // With express.raw middleware properly applied, req.body is the raw buffer
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received Stripe event: ${event.type}`, event.data.object.id);

  // Handle the event
  try {
    let workspace;
    let subscription;
    let session;
    let stripeCustomerId;
    let setupIntent;
    let paymentIntent;
    let paymentMethodId;
    let paymentMethod;

    switch (event.type) {
      case 'setup_intent.succeeded':
        setupIntent = event.data.object;
        stripeCustomerId = setupIntent.customer;
        paymentMethodId = setupIntent.payment_method;
        
        console.log(`Webhook: Setup intent succeeded. Customer: ${stripeCustomerId}, PaymentMethod: ${paymentMethodId}`);
        
        if (!stripeCustomerId || !paymentMethodId) {
          console.error('Webhook Error: setup_intent.succeeded missing customer or payment method ID.');
          break;
        }
        
        // If this is the first payment method for this customer, set it as the default
        const paymentMethods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: 'card',
        });
        
        if (paymentMethods.data.length === 1) {
          // This is the first payment method, set it as default
          // For regular Stripe Checkout this might happen automatically, but for SetupIntents we need to check
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId
            }
          });
          console.log(`Webhook: Set payment method ${paymentMethodId} as default for customer ${stripeCustomerId}`);
          
          // Optionally mark this payment method with metadata
          await stripe.paymentMethods.update(paymentMethodId, {
            metadata: { isDefault: 'true' }
          });
        }
        
        // Find the workspace associated with this customer
        workspace = await Workspace.findOne({ stripeCustomerId: stripeCustomerId });
        if (!workspace) {
          console.error(`Webhook Error: Workspace not found for customer ID ${stripeCustomerId} from setup_intent.succeeded.`);
          break;
        }
        
        // You can do more here if needed, like updating workspace state or sending notifications
        console.log(`Webhook: Payment method added for workspace ${workspace._id}`);
        break;

      case 'payment_method.detached':
        paymentMethod = event.data.object;
        stripeCustomerId = paymentMethod.customer;
        
        if (!stripeCustomerId) {
          console.log('Payment method detached, but not associated with a customer. Skipping.');
          break;
        }
        
        console.log(`Webhook: Payment method ${paymentMethod.id} detached from customer ${stripeCustomerId}`);
        
        // Find the workspace associated with this customer
        workspace = await Workspace.findOne({ stripeCustomerId: stripeCustomerId });
        if (!workspace) {
          console.error(`Webhook Error: Workspace not found for customer ID ${stripeCustomerId} from payment_method.detached.`);
          break;
        }
        
        // You might want to check if the customer has any payment methods left
        // and take appropriate action if they don't
        
        console.log(`Webhook: Payment method removed for workspace ${workspace._id}`);
        break;

      case 'checkout.session.completed':
        session = event.data.object;
        stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        console.log(`Webhook: Checkout session completed. Customer: ${stripeCustomerId}, Subscription: ${stripeSubscriptionId}, Session: ${session.id}`);

        if (!stripeCustomerId || !stripeSubscriptionId) {
             console.error('Webhook Error: checkout.session.completed missing customer or subscription ID.');
             break; // Exit switch case
        }


        // Retrieve the full subscription to get details like status and price
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if (!subscription) {
            console.error(`Webhook Error: Could not retrieve subscription ${stripeSubscriptionId} after checkout.`);
            break;
        }

        workspace = await Workspace.findOne({ stripeCustomerId: stripeCustomerId });
        if (workspace) {
           // Prevent processing duplicates if webhook is received multiple times
           if (workspace.stripeSubscriptionId === stripeSubscriptionId && workspace.subscriptionStatus === subscription.status){
               console.log(`Webhook: Workspace ${workspace._id} already up-to-date for subscription ${stripeSubscriptionId}. Skipping update.`);
               break;
           }

           console.log(`Webhook: Updating workspace ${workspace._id} from checkout session.`);
           workspace.stripeSubscriptionId = stripeSubscriptionId;
           workspace.subscriptionStatus = subscription.status; // e.g., 'trialing' or 'active'
           // Safely access nested properties
           workspace.stripePriceId = subscription.items?.data[0]?.price?.id || null;
           const interval = subscription.items?.data[0]?.price?.recurring?.interval || 'free';
           workspace.billingCycleInterval = interval === 'month' ? 'monthly' : interval === 'year' ? 'yearly' : 'free';
           // Anchor date might be trial end or period start
           workspace.billingCycleAnchor = subscription.trial_end ? new Date(subscription.trial_end * 1000) : new Date(subscription.current_period_start * 1000);

           await workspace.save();
           console.log(`Webhook: Workspace ${workspace._id} updated successfully.`);
        } else {
           console.error(`Webhook Error: Workspace not found for customer ID ${stripeCustomerId} from checkout.session.completed.`);
        }
        break;

      case 'payment_intent.succeeded':
        paymentIntent = event.data.object;
        stripeCustomerId = paymentIntent.customer;
        paymentMethodId = paymentIntent.payment_method;
        console.log(`Webhook: Payment Intent ${paymentIntent.id} succeeded for customer ${stripeCustomerId}.`);

        // ---> START: New logic for subscription creation after successful PI <-----
        if (paymentIntent.setup_future_usage === 'off_session' && 
            paymentIntent.metadata.intentType === 'subscription_setup' && 
            paymentIntent.metadata.priceId && 
            paymentIntent.metadata.workspaceId) {

            console.log(`Webhook: Payment Intent ${paymentIntent.id} identified as subscription setup.`);
            
            if (!stripeCustomerId || !paymentMethodId) {
                 console.error('Webhook Error: payment_intent.succeeded for subscription setup missing customer or payment method ID.');
                 break; // Exit switch case
            }
            
            const priceId = paymentIntent.metadata.priceId;
            const workspaceId = paymentIntent.metadata.workspaceId;
            
            // Find the associated workspace
            workspace = await Workspace.findOne({ _id: workspaceId, stripeCustomerId: stripeCustomerId });
            if (!workspace) {
                 console.error(`Webhook Error: Workspace ${workspaceId} not found for customer ${stripeCustomerId} during subscription creation.`);
                 break;
            }

            // **Idempotency Check:** Prevent creating duplicate subscriptions if webhook is retried
            if (workspace.stripeSubscriptionId && workspace.subscriptionStatus !== 'incomplete' && workspace.subscriptionStatus !== 'incomplete_expired') {
                 // Check if a subscription linked to this Price ID already exists and is active/trialing
                 try {
                     const existingSubscriptions = await stripe.subscriptions.list({
                         customer: stripeCustomerId,
                         price: priceId, // Filter by the specific price
                         status: 'all' // Check all statuses initially
                     });
                     const activeOrTrialingSub = existingSubscriptions.data.some(sub => 
                         ['active', 'trialing', 'past_due'].includes(sub.status) && sub.id === workspace.stripeSubscriptionId
                     );

                     if(activeOrTrialingSub) {
                         console.log(`Webhook: Workspace ${workspaceId} already has an active/trialing subscription (${workspace.stripeSubscriptionId}) for price ${priceId}. Skipping new subscription creation.`);
                         break; // Exit: Subscription likely already created
                     }
                     console.log(`Webhook: No conflicting active/trialing subscription found for price ${priceId}. Proceeding.`);
                 } catch (listSubError) {
                      console.error(`Webhook Error: Failed to list existing subscriptions for idempotency check: ${listSubError.message}`);
                      // Decide whether to proceed or break based on error handling strategy
                      break;
                 }
            }
            
            try {
                 // Set the payment method as the default for future invoices (important for renewals)
                 await stripe.customers.update(stripeCustomerId, {
                     invoice_settings: {
                         default_payment_method: paymentMethodId,
                     },
                 });
                 console.log(`Webhook: Set ${paymentMethodId} as default payment method for customer ${stripeCustomerId}.`);

                 // Create the actual subscription
                 const newSubscriptionParams = {
                     customer: stripeCustomerId,
                     items: [{ price: priceId }],
                     default_payment_method: paymentMethodId,
                     expand: ['latest_invoice', 'pending_setup_intent'], // Useful for checking status immediately
                     // You can add trial settings here if not defined on the Price object in Stripe:
                     // trial_period_days: 30, 
                     metadata: {
                         workspaceId: workspaceId,
                         userId: paymentIntent.metadata.userId, // Carry over user ID if available
                         triggeringPaymentIntent: paymentIntent.id // Link subscription back to the PI that triggered it
                     }
                 };
                 
                 // Handle trial from plan setting
                 const priceDetails = await stripe.prices.retrieve(priceId);
                 if(priceDetails.recurring.trial_period_days){ // Check if price has trial days defined
                    // Note: If PI had an amount > 0, trial might not apply depending on Stripe settings.
                    // trial_from_plan is safer with Checkout Session, manual creation requires careful checks.
                    // For simplicity, we'll just add trial days if present on price.
                    // newSubscriptionParams.trial_period_days = priceDetails.recurring.trial_period_days; 
                    // OR better: Let Stripe handle trial based on Price object by default
                     console.log(`Webhook: Price ${priceId} has trial days, Stripe will handle trial on subscription creation.`);
                 }

                 subscription = await stripe.subscriptions.create(newSubscriptionParams);
                 console.log(`Webhook: Subscription ${subscription.id} created successfully for workspace ${workspaceId}. Status: ${subscription.status}`);

                 // Update workspace model
                 workspace.stripeSubscriptionId = subscription.id;
                 workspace.subscriptionStatus = subscription.status; // e.g., 'trialing', 'active', 'incomplete'
                 workspace.stripePriceId = priceId;
                 const interval = subscription.items?.data[0]?.price?.recurring?.interval || 'free';
                 workspace.billingCycleInterval = interval === 'month' ? 'monthly' : interval === 'year' ? 'yearly' : 'free';
                 workspace.billingCycleAnchor = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

                 // *** Add logic to set planAllocatedCredits ***
                 if (workspace.billingCycleInterval === 'monthly') {
                     workspace.planAllocatedCredits = 50000;
                 } else if (workspace.billingCycleInterval === 'yearly') {
                     workspace.planAllocatedCredits = 600000;
                 } else {
                     workspace.planAllocatedCredits = 0;
                 }
                 // *** End logic ***

                 await workspace.save();
                 console.log(`Webhook: Workspace ${workspaceId} updated with subscription details and credits.`);

            } catch (subError) {
                 console.error(`Webhook Error: Failed to create subscription or update customer for PI ${paymentIntent.id}:`, subError);
                 // Consider how to handle this - maybe mark workspace status as needing attention?
            }
        }
        // ---> END: New logic <-----
        // ---> START: New logic for PAYG top-up after successful PI <-----
        else if (paymentIntent.metadata.intentType === 'pay_as_you_go_top_up' && 
                 paymentIntent.metadata.workspaceId) {

            console.log(`Webhook: Payment Intent ${paymentIntent.id} identified as PAYG top-up.`);

            if (!stripeCustomerId) { // Customer ID should exist if PI succeeded against a customer
                 console.error(`Webhook Error: payment_intent.succeeded for PAYG top-up missing customer ID for PI ${paymentIntent.id}.`);
                 break; // Exit switch case
            }
            
            const workspaceId = paymentIntent.metadata.workspaceId;
            const amountPaid = paymentIntent.amount_received; // Amount in cents
            const currency = paymentIntent.currency;

            workspace = await Workspace.findOne({ _id: workspaceId, stripeCustomerId: stripeCustomerId });
            if (!workspace) {
                 console.error(`Webhook Error: Workspace ${workspaceId} not found or customer mismatch for PAYG top-up PI ${paymentIntent.id}.`);
                 break;
            }

            if (currency.toLowerCase() !== 'usd') {
                console.warn(`Webhook Warning: PAYG top-up for PI ${paymentIntent.id} was in ${currency}, not USD. Credits not added. Workspace: ${workspaceId}`);
                break;
            }

            const creditsToAdd = Math.floor((amountPaid / 100) * 200); // 200 credits per USD

            if (creditsToAdd <= 0) {
                console.warn(`Webhook Warning: Calculated credits to add is ${creditsToAdd} for PI ${paymentIntent.id}. No credits added. Workspace: ${workspaceId}`);
                break;
            }

            const newCreditEntry = {
                amount: creditsToAdd,
                source: 'top-up',
                description: `Pay As You Go Top-up (PaymentIntent: ${paymentIntent.id})`,
                addedAt: new Date(),
            };

            workspace.oneTimeCredits.push(newCreditEntry);
            // Potentially update autoRechargeEnabled if this was the enabling payment and it's not yet enabled.
            // For now, assume enabling PAYG is handled by a separate UI flow that calls the auto-recharge-settings endpoint.
            
            await workspace.save();
            console.log(`Webhook: Added ${creditsToAdd} credits to workspace ${workspaceId} from PAYG top-up PI ${paymentIntent.id}.`);

        }
        // ---> END: New logic for PAYG <-----
        else {
            console.log(`Webhook: Payment Intent ${paymentIntent.id} succeeded, but not identified as subscription setup or PAYG top-up. No specific action taken.`);
            // Handle regular one-time payment success if necessary (e.g., grant credits, update order status)
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        subscription = event.data.object;
        stripeCustomerId = subscription.customer;
        console.log(`Webhook: Subscription event ${event.type}. Subscription: ${subscription.id}, Status: ${subscription.status}, Customer: ${stripeCustomerId}`);

        if(!stripeCustomerId){
            console.error(`Webhook Error: ${event.type} missing customer ID.`);
            break;
        }

        workspace = await Workspace.findOne({ stripeCustomerId: stripeCustomerId });

        if (workspace) {
           // *** Modify the condition to allow updates more reliably, especially for initial creation ***
           // Update if: 
           // 1. The subscription ID matches the event (or is not set yet)
           // AND ( 
           //   2. The status is different from the event's status 
           //   OR 
           //   3. The billingCycleAnchor is currently null (needs update from event data)
           // )
           const needsUpdate = (workspace.stripeSubscriptionId === subscription.id || !workspace.stripeSubscriptionId) && 
                             (workspace.subscriptionStatus !== subscription.status || !workspace.billingCycleAnchor);
                             
           if (needsUpdate) { 
               console.log(`Webhook: Updating workspace ${workspace._id} status/details from subscription event ${event.type}.`);
               workspace.stripeSubscriptionId = subscription.id; 
               workspace.subscriptionStatus = subscription.status;
               workspace.stripePriceId = subscription.items?.data[0]?.price?.id || null;
               const interval = subscription.items?.data[0]?.price?.recurring?.interval || 'free';
               workspace.billingCycleInterval = interval === 'month' ? 'monthly' : interval === 'year' ? 'yearly' : 'free';
               workspace.billingCycleAnchor = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null; 

               // Set allocated credits based on interval
               if (workspace.billingCycleInterval === 'monthly') {
                   workspace.planAllocatedCredits = 50000;
               } else if (workspace.billingCycleInterval === 'yearly') {
                   workspace.planAllocatedCredits = 600000;
               } else {
                   workspace.planAllocatedCredits = 0;
               }
               
               // Handle cancellation specifically within the update block
               if (subscription.status === 'canceled' || event.type === 'customer.subscription.deleted') {
                 console.log(`Webhook: Subscription ${subscription.id} canceled for workspace ${workspace._id}. Resetting fields further.`);
                 // This ensures correct state even if event is just 'updated' to 'canceled'
                 workspace.billingCycleInterval = 'free'; 
                 workspace.billingCycleAnchor = null;
                 workspace.planAllocatedCredits = 0;
                 // Optionally clear priceId, etc.
                 // workspace.stripePriceId = null;
               }

               await workspace.save();
               console.log(`Webhook: Workspace ${workspace._id} updated successfully from ${event.type} including credits.`);
           } else {
               console.log(`Webhook: Skipping update for workspace ${workspace._id}. Event data for sub ${subscription.id} (status: ${subscription.status}) likely matches current DB state including billing anchor.`);
           }
        } else {
          console.error(`Webhook Error: Workspace not found for customer ID ${stripeCustomerId} from subscription event ${event.type}.`);
        }
        break;

      case 'invoice.paid':
        const invoicePaid = event.data.object;
        stripeCustomerId = invoicePaid.customer;
        console.log(`Webhook: Invoice paid. Invoice: ${invoicePaid.id}, Customer: ${stripeCustomerId}`);

        if(!stripeCustomerId){
             console.error(`Webhook Error: invoice.paid missing customer ID.`);
             break;
        }

        workspace = await Workspace.findOne({ stripeCustomerId: stripeCustomerId });
        if (workspace) {
          // Safeguard: Ensure subscription is marked active and credits potentially allocated
          if (workspace.subscriptionStatus !== 'active' && workspace.subscriptionStatus !== 'trialing' && invoicePaid.subscription === workspace.stripeSubscriptionId) {
              console.log(`Webhook: Updating workspace ${workspace._id} status to 'active' after invoice payment.`);
              workspace.subscriptionStatus = 'active';
              
              // *** Re-check interval and set credits if activating from invoice.paid ***
              // We might need to fetch the subscription again here for the interval, or rely on stored priceId/interval
              // For simplicity, let's assume interval is already correctly stored or was updated via subscription event.
              // If not, a subscription retrieve would be needed here.
              if (workspace.billingCycleInterval === 'monthly') {
                  workspace.planAllocatedCredits = 50000;
              } else if (workspace.billingCycleInterval === 'yearly') {
                  workspace.planAllocatedCredits = 600000;
              } else {
                  workspace.planAllocatedCredits = 0; // Should ideally not be 'free' if invoice was paid for sub
              }
              console.log(`Webhook: Set planAllocatedCredits to ${workspace.planAllocatedCredits} based on interval ${workspace.billingCycleInterval}.`);
              // *** End logic ***
              
              await workspace.save();
          }
          // Optional: Grant credits or perform actions related to successful payment
        } else {
           console.error(`Webhook Error: Workspace not found for customer ID ${stripeCustomerId} from invoice.paid event.`);
        }
        break;

      case 'invoice.payment_failed':
        const invoiceFailed = event.data.object;
        stripeCustomerId = invoiceFailed.customer;
        console.log(`Webhook: Invoice payment failed. Invoice: ${invoiceFailed.id}, Customer: ${stripeCustomerId}`);

        if(!stripeCustomerId){
             console.error(`Webhook Error: invoice.payment_failed missing customer ID.`);
             break;
        }

        workspace = await Workspace.findOne({ stripeCustomerId: stripeCustomerId });
        if (workspace) {
          // Update status based on subscription changes triggered by failure.
          // Stripe usually sends a 'customer.subscription.updated' event with status 'past_due' or 'unpaid'.
          // Relying on that event is often better than directly setting status here.
          console.log(`Webhook: Payment failed for workspace ${workspace._id}. Subscription status should update via subscription webhook.`);
          // Optional: Send notification to user about payment failure.
        } else {
            console.error(`Webhook Error: Workspace not found for customer ID ${stripeCustomerId} from invoice.payment_failed event.`);
        }
        break;

      case 'customer.subscription.deleted': 
        subscription = event.data.object;
        stripeCustomerId = subscription.customer;
        console.log(`Webhook: Subscription deleted. Subscription: ${subscription.id}, Customer: ${stripeCustomerId}`);
        
        if(!stripeCustomerId){
            console.error(`Webhook Error: ${event.type} missing customer ID.`);
            break;
        }
        
        workspace = await Workspace.findOne({ stripeCustomerId: stripeCustomerId });
        
        if (workspace && workspace.stripeSubscriptionId === subscription.id) {
             console.log(`Webhook: Subscription ${subscription.id} deleted for workspace ${workspace._id}. Resetting billing fields.`);
             // Reset relevant fields upon deletion
             // workspace.stripeSubscriptionId = null; // Keep it for history? Or nullify?
             workspace.subscriptionStatus = subscription.status; // Status will be 'canceled'
             // workspace.stripePriceId = null;
             workspace.billingCycleInterval = 'free'; 
             // *** Ensure credits are set to 0 on deletion ***
             workspace.planAllocatedCredits = 0; 
             // *** End logic ***
             workspace.billingCycleAnchor = null; 
             await workspace.save();
             console.log(`Webhook: Workspace ${workspace._id} billing fields reset including credits.`);
        } else if (workspace) {
             console.log(`Webhook: Received delete event for sub ${subscription.id}, but workspace ${workspace._id} has different/no sub ID (${workspace.stripeSubscriptionId}). Skipping.`);
        } else {
             console.error(`Webhook Error: Workspace not found for customer ID ${stripeCustomerId} from subscription event ${event.type}.`);
        }
        break;

      default:
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });

  } catch (error) {
      console.error(`Webhook Error processing event ${event.type}:`, error);
      // Don't send 500 for webhook processing errors unless absolutely necessary,
      // as Stripe might retry. Acknowledge receipt if signature was valid.
      res.status(200).json({ received: true, error: `Internal server error processing webhook: ${error.message}` });
  }
};

// --- Handler for Auto-Recharge Settings ---
const handleUpdateAutoRechargeSettings = async (req, res) => {
  const { 
    workspaceId, 
    autoRechargeEnabled, 
    autoRechargeThresholdCredits, 
    autoRechargeAmountToAddCredits, 
    autoRechargeChargeAmount, 
    autoRechargeCurrency 
  } = req.body;
  const userId = req.user.id;

  if (workspaceId === undefined) { // Check for undefined explicitly
    return res.status(400).json({ message: 'Workspace ID is required.' });
  }
  if (autoRechargeEnabled === undefined) { // Check for undefined explicitly
    return res.status(400).json({ message: 'autoRechargeEnabled (boolean) is required.'});
  }

  console.log(`User ${userId} updating auto-recharge settings for workspace ${workspaceId}:`, req.body);

  try {
    const workspace = await findAndVerifyWorkspace(workspaceId, userId); // Verifies ownership

    // Always update autoRechargeEnabled based on the request
    workspace.autoRechargeEnabled = autoRechargeEnabled;

    if (autoRechargeEnabled) {
      // Strict validation when autoRechargeEnabled is true
      if (autoRechargeThresholdCredits !== undefined) {
        const threshold = Number(autoRechargeThresholdCredits);
        if (isNaN(threshold) || threshold < 0) {
          return res.status(400).json({ message: 'Invalid autoRechargeThresholdCredits. Must be a non-negative number when auto-recharge is enabled.' });
        }
        workspace.autoRechargeThresholdCredits = threshold;
      }
      if (autoRechargeAmountToAddCredits !== undefined) {
        const amountToAdd = Number(autoRechargeAmountToAddCredits);
        if (isNaN(amountToAdd) || amountToAdd <= 0) {
          return res.status(400).json({ message: 'Invalid autoRechargeAmountToAddCredits. Must be a positive number when auto-recharge is enabled.' });
        }
        workspace.autoRechargeAmountToAddCredits = amountToAdd;
      }
      if (autoRechargeChargeAmount !== undefined) {
        const chargeAmount = Number(autoRechargeChargeAmount);
        if (isNaN(chargeAmount) || chargeAmount <= 0) {
          return res.status(400).json({ message: 'Invalid autoRechargeChargeAmount. Must be a positive number (smallest currency unit) when auto-recharge is enabled.' });
        }
        workspace.autoRechargeChargeAmount = chargeAmount;
      }
      if (autoRechargeCurrency !== undefined) {
        if (typeof autoRechargeCurrency !== 'string' || autoRechargeCurrency.length !== 3) {
          return res.status(400).json({ message: 'Invalid autoRechargeCurrency. Must be a 3-letter ISO currency code when auto-recharge is enabled.' });
        }
        workspace.autoRechargeCurrency = autoRechargeCurrency.toLowerCase();
      }
    } else {
      // autoRechargeEnabled is false. More relaxed validation if fields are provided.
      if (autoRechargeThresholdCredits !== undefined) {
        const threshold = Number(autoRechargeThresholdCredits);
        if (isNaN(threshold)) {
          return res.status(400).json({ message: 'Invalid autoRechargeThresholdCredits. Must be a number if provided.' });
        }
        workspace.autoRechargeThresholdCredits = threshold; // Allow any numeric value when disabled
      }
      if (autoRechargeAmountToAddCredits !== undefined) {
        const amountToAdd = Number(autoRechargeAmountToAddCredits);
        if (isNaN(amountToAdd)) {
          return res.status(400).json({ message: 'Invalid autoRechargeAmountToAddCredits. Must be a number if provided.' });
        }
        workspace.autoRechargeAmountToAddCredits = amountToAdd; // Allow any numeric value when disabled
      }
      if (autoRechargeChargeAmount !== undefined) {
        const chargeAmount = Number(autoRechargeChargeAmount);
        if (isNaN(chargeAmount)) {
          return res.status(400).json({ message: 'Invalid autoRechargeChargeAmount. Must be a number if provided.' });
        }
        workspace.autoRechargeChargeAmount = chargeAmount; // Allow any numeric value when disabled
      }
      if (autoRechargeCurrency !== undefined) {
        if (typeof autoRechargeCurrency !== 'string') { // Basic type check
        }
        // We could still enforce 3-letter format if desired, or be more lenient
        workspace.autoRechargeCurrency = autoRechargeCurrency?.toLowerCase()   || 'usd';
      }
    }

    await workspace.save();

    const updatedSettings = {
      autoRechargeEnabled: workspace.autoRechargeEnabled,
      autoRechargeThresholdCredits: workspace.autoRechargeThresholdCredits,
      autoRechargeAmountToAddCredits: workspace.autoRechargeAmountToAddCredits,
      autoRechargeChargeAmount: workspace.autoRechargeChargeAmount,
      autoRechargeCurrency: workspace.autoRechargeCurrency,
    };

    console.log(`Auto-recharge settings updated for workspace ${workspaceId}:`, updatedSettings);
    res.json({
      message: 'Auto-recharge settings updated successfully.',
      updatedSettings: updatedSettings
    });

  } catch (error) {
    console.error('Error updating auto-recharge settings:', error);
    if (error.message.includes('Workspace not found') || error.message.includes('User does not have permission')) {
        return res.status(403).json({ message: error.message }); // Or 404 for not found
    }
    res.status(500).json({ message: `Failed to update auto-recharge settings: ${error.message}` });
  }
};

// --- Handler for PAYG Status Check ---
const handleGetPayAsYouGoStatus = async (req, res) => {
  const { workspaceId } = req.query;
  const userId = req.user.id;

  if (!workspaceId) {
    return res.status(400).json({ message: 'Workspace ID is required.' });
  }

  console.log(`User ${userId} checking PAYG status for workspace ${workspaceId}`);

  try {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      console.log(`PAYG status check: Workspace ${workspaceId} not found.`);
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Verify user has access (owner or member)
    const isOwner = workspace.user.toString() === userId.toString();
    const isMember = workspace.members.some(member => member.user.toString() === userId.toString());
    if (!isOwner && !isMember) {
      return res.status(403).json({ error: "Not authorized to access this workspace" });
    }

    // PAYG is considered active if autoRechargeEnabled is true and a stripeCustomerId exists.
    // The existence of a payment method is implied by the setup process for autoRechargeEnabled.
    const isPaygActive = !!(workspace.autoRechargeEnabled && workspace.stripeCustomerId);

    console.log(`PAYG status for workspace ${workspaceId}: ${isPaygActive} (autoRechargeEnabled: ${workspace.autoRechargeEnabled}, stripeCustomerId: ${!!workspace.stripeCustomerId})`);

    res.json({ isActive: isPaygActive });

  } catch (error) {
    console.error('Error checking PAYG status:', error);
    res.status(500).json({ message: `Failed to check PAYG status: ${error.message}` });
  }
};

// --- Update exports ---
module.exports = {
  findAndVerifyWorkspace,
  handleCreateCheckoutSession,
  handleCreatePortalSession,
  handleStripeWebhook,
  handleCreateSetupIntent,
  handleGetPaymentMethods,
  handleDeletePaymentMethod,
  handleSetDefaultPaymentMethod,
  handleCreatePaymentIntent,
  handleChargeWithSavedMethod,
  handlePrepareSubscriptionIntent,
  handleGetSubscriptionStatus,
  handleGetPlanDetails,
  handleGetPaginatedInvoices,
  handleUpdateAutoRechargeSettings,
  handleGetPayAsYouGoStatus,
}; 