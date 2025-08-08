"use client";
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Assuming you have a Switch component
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import Image from "next/image";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useWorkspace } from "@/context/WorkspaceContext";
import PaymentProcessingScreen from "./PaymentProcessingScreen";
import { creditsToUSD, usdToCredits } from "@/lib/utils";
// Re-use or adapt AddCardForm from SubscriptionConfirmDialog or create a local version
// For now, let's assume a similar AddCardForm structure is needed.
// It's better to make it a shared component if it's identical.

// Payment Form Skeleton component
const PaymentFormSkeleton = () => {
  return (
    <div className="animate-pulse space-y-6">
      <div className="mb-4">
        <div className="space-y-4">
          <div>
            <div className="h-5 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded"></div>
          </div>
          <div>
            <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded"></div>
          </div>
          <div>
            <div className="h-5 w-28 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded"></div>
          </div>
          <div>
            <div className="h-5 w-20 bg-gray-200 rounded mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="mt-4 h-16 w-full bg-gray-100 rounded"></div>
      </div>
    </div>
  );
};

// --- Stripe Initialization (Module Level) ---
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.reject(
      new Error(
        "Stripe publishable key is not defined - Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
      )
    );
// --- End Stripe Initialization ---

// TODO: Define or import AddCardForm component similar to SubscriptionConfirmDialog
const AddCardForm = forwardRef(
  ({ clientSecret, onSetupComplete, onError }, ref) => {
    const stripe = useStripe();
    const elements = useElements();
    const [formError, setFormError] = useState(null);

    const handleConfirmPayment = async () => {
      if (!stripe || !elements) {
        onError("Stripe.js has not loaded yet.");
        return { error: true };
      }
      setFormError(null);
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-status`, // Generic status page
        },
        redirect: "if_required",
      });
      if (error) {
        setFormError(error.message);
        onError(error.message);
        return { error: true };
      }
      return { success: true };
    };

    useImperativeHandle(ref, () => ({
      submitAndConfirmPayment: handleConfirmPayment,
    }));

    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Add Payment Method
        </h3>
        <PaymentElement options={{ layout: "tabs" }} />
        {formError && (
          <div className="text-red-500 text-sm mt-2">{formError}</div>
        )}
      </div>
    );
  }
);
AddCardForm.displayName = "AddCardForm";

export default function PayAsYouGoDialog({
  open,
  onOpenChange,
  onSuccess, // Callback when payment is fully confirmed via polling
  defaultPaymentMethodFromParent, // New prop
}) {
  const {
    workspaceId,
    workspaceInfo,
    createOneTimePaymentIntent,
    updateAutoRechargeSettings,
    getPaymentMethods,
  } = useWorkspace();

  const [amount, setAmount] = useState(10); // Default to $10, user can change
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  // TODO: Add state for auto-recharge threshold and amount if needed

  const [isLoading, setIsLoading] = useState(false); // General loading for confirm payment
  const [isSavingSettings, setIsSavingSettings] = useState(false); // For "Save Settings" button
  const [error, setError] = useState(null);
  const [stripeError, setStripeError] = useState(false); // For Stripe specific setup errors
  const [dialogClientSecret, setDialogClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [isPreparingIntent, setIsPreparingIntent] = useState(false);
  const [isAwaitingBackendConfirmation, setIsAwaitingBackendConfirmation] =
    useState(false);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState(null); // Will be set by prop

  const addCardFormRef = useRef();
  const intentRequestedRef = useRef(false);

  // Card brand icons (can be a shared utility)
  const CARD_ICONS = {
    visa: "/images/payment/flat-rounded/visa.svg",
    mastercard: "/images/payment/flat-rounded/mastercard.svg",
    // ... other icons
    unknown: "/images/payment/flat-rounded/generic.svg",
  };
  const getCardIcon = (brand) =>
    CARD_ICONS[brand?.toLowerCase()] || CARD_ICONS.unknown;

  // Effect to initialize currentPaymentMethod from prop and reset states when dialog opens/prop changes
  useEffect(() => {
    if (open) {
      setCurrentPaymentMethod(defaultPaymentMethodFromParent || null);
      // Reset states that might depend on the payment method or a previous PI
      setDialogClientSecret(null);
      setPaymentIntentId(null);
      setError(null); // Clear previous errors
      setStripeError(false);
      setIsPreparingIntent(false);
      intentRequestedRef.current = false; // Allow PI creation if needed for a new card
      // Amount and autoRechargeEnabled can retain their values or be reset here based on desired UX
      // For now, they retain their values if the dialog is just re-rendered with a new PM.
    } else {
      // When dialog is not open, ensure currentPaymentMethod is also cleared internally
      // though parent is expected to manage the prop for next open.
      setCurrentPaymentMethod(null);
    }
  }, [open, defaultPaymentMethodFromParent]);

  // Effect to prepare Payment Intent for new card when amount changes or dialog opens for new card
  useEffect(() => {
    console.log(dialogClientSecret, isSavingSettings, "dialogClientSecret");
    if (
      open &&
      !currentPaymentMethod &&
      amount > 0 &&
      !dialogClientSecret &&
      !intentRequestedRef.current &&
      !isSavingSettings
    ) {
      console.log(`PayAsYouGo: Preparing PI for new card, amount: ${amount}`);
      setIsPreparingIntent(true);
      setError(null);
      setStripeError(false);
      intentRequestedRef.current = true;

      createOneTimePaymentIntent(amount * 100) // Convert to cents
        .then((data) => {
          console.log(data?.clientSecret, "data from one time payment intent");
          if (!data?.clientSecret) {
            throw new Error("Client secret or PaymentIntent ID not received.");
          }
          setDialogClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId); // Store PI ID
        })
        .catch((err) => {
          setError(err.message || "Failed to initialize payment.");
          setStripeError(true);
          intentRequestedRef.current = false;
        })
        .finally(() => setIsPreparingIntent(false));
    } else if (!open) {
      setDialogClientSecret(null);
      setPaymentIntentId(null);
      setError(null);
      setIsPreparingIntent(false);
      setStripeError(false);
      intentRequestedRef.current = false;
    }
  }, [
    open,
    currentPaymentMethod,
    amount,
    createOneTimePaymentIntent,
    dialogClientSecret,
    isSavingSettings,
  ]);

  const handleAmountChange = (e) => {
    setIsSavingSettings(true);

    const newAmount = Math.max(0, parseInt(e.target.value, 10) || 0);
    setAmount(newAmount);
    // If intent was for a different amount with new card, might need to reset/refetch
    if (!currentPaymentMethod) {
      setDialogClientSecret(null);
      setPaymentIntentId(null);
      intentRequestedRef.current = false; // Allow refetch
    }
  };

  // Add debouncer for auto-save settings
  useEffect(() => {
    if (!open) return; // Don't run if dialog is not open
    setIsSavingSettings(true);

    const timer = setTimeout(() => {
      handleSaveSettings();
    }, 1000); // 1.5 seconds debounce

    return () => clearTimeout(timer);
  }, [amount, autoRechargeEnabled, open]);

  const handleSaveSettings = async () => {
    setError(null);
    try {
      const settingsToUpdate = {
        autoRechargeEnabled: autoRechargeEnabled,
      };

      if (autoRechargeEnabled) {
        // If enabling, use the current dialog amount as the auto-recharge amount
        if (amount > 0) {
          // Only set if amount is valid
          settingsToUpdate.autoRechargeChargeAmount = amount * 100; // amount is in dollars, convert to cents
          // You might also want to set a default threshold here if not otherwise specified by user input later
          // settingsToUpdate.autoRechargeThresholdCredits = 100; // Example default if you add such a field
        } else {
          // Handle case where auto-recharge is enabled but amount is 0 or invalid
          // Maybe prevent saving or show an error, or have backend default
          console.warn(
            "Auto-recharge enabled with invalid amount, charge amount not set."
          );
        }
      } else {
        // If disabling, you might want to clear previous autoRecharge specific values on backend
        // by sending them as null or having backend handle it.
        // For now, just sending isEnabled: false.
      }

      await updateAutoRechargeSettings(settingsToUpdate);
      // Show success (e.g., toast)
      console.log("Auto-recharge settings saved:", settingsToUpdate);
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConfirmAndPay = async () => {
    if (amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      let piClientSecret = dialogClientSecret;
      let piId = paymentIntentId;

      // Case 1: Using an existing payment method
      if (currentPaymentMethod) {
        console.log(
          `PayAsYouGo: Creating PI for existing PM: ${currentPaymentMethod.id}, amount: ${amount}`
        );
        const intentData = await createOneTimePaymentIntent(amount * 100); // amount in cents
        if (!intentData?.clientSecret || !intentData?.paymentIntentId) {
          throw new Error("Failed to create payment intent for existing card.");
        }
        piClientSecret = intentData.clientSecret;
        piId = intentData.paymentIntentId;

        console.log(`PayAsYouGo: Confirming card payment for PI: ${piId}`);
        const stripe = await stripePromise;
        const { error: confirmError, paymentIntent: confirmedPi } =
          await stripe.confirmCardPayment(piClientSecret, {
            payment_method: currentPaymentMethod.id,
          });

        if (confirmError) {
          throw confirmError; // Let catch block handle it
        }
        if (
          confirmedPi?.status === "succeeded" ||
          confirmedPi?.status === "processing"
        ) {
          setPaymentIntentId(confirmedPi.id); // Ensure we have the final PI ID
          setIsAwaitingBackendConfirmation(true);
        } else if (
          confirmedPi?.status === "requires_action" ||
          confirmedPi?.status === "requires_confirmation"
        ) {
          setError(
            "Further action required to complete payment. Please follow prompts."
          );
          // Stripe.js might handle redirects for 3DS here if not done automatically
          // If stripe.handleCardAction(piClientSecret) is needed, integrate here.
        } else {
          throw new Error(
            confirmedPi?.last_payment_error?.message ||
              "Payment failed after confirmation."
          );
        }
      }
      // Case 2: Adding a new card (client secret should be for current amount)
      else if (piClientSecret && addCardFormRef.current) {
        console.log(
          `PayAsYouGo: Confirming payment via AddCardForm for PI: ${piId}`
        );
        const result = await addCardFormRef.current.submitAndConfirmPayment(); // Uses piClientSecret via Elements options
        if (result?.error) {
          // Error already set by AddCardForm's onError callback
          setIsLoading(false);
          return;
        }
        // If no immediate error, Stripe is processing or redirecting
        setIsAwaitingBackendConfirmation(true);
      } else {
        throw new Error("Payment details not ready. Please try again.");
      }
    } catch (err) {
      console.error("Payment confirmation error:", err);
      setError(err.message || "An error occurred during payment.");
      setIsLoading(false);
    }
    // Do not set isLoading false here if going to processing screen
  };

  const handlePollingSuccess = () => {
    setIsAwaitingBackendConfirmation(false);
    onSuccess && onSuccess(paymentIntentId); // Pass PI ID or relevant info
    // onOpenChange(false); // Parent now handles closing and resetting the prop for PAYG flow
    // Let parent control open state fully via onOpenChange triggered by this success if needed.
  };

  const handlePollingError = (errorMessage) => {
    setIsAwaitingBackendConfirmation(false);
    setError(errorMessage || "Failed to confirm payment status.");
    setIsLoading(false);
  };

  useEffect(() => {
    stripePromise.catch(() => {
      setStripeError(true);
      setError("Stripe configuration error.");
    });
  }, []);

  if (isAwaitingBackendConfirmation) {
    return (
      <PaymentProcessingScreen
        onSuccess={handlePollingSuccess}
        onError={handlePollingError}
        flowType="payg"
        paymentIntentId={paymentIntentId}
        // Consider if PaymentProcessingScreen needs paymentIntentId to poll specific status
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {" "}
        {/* Or sm:max-w-4xl */}
        <DialogHeader>
          <DialogTitle>Add Credits (Pay As You Go)</DialogTitle>
          <DialogDescription>
            Add funds to your account. Optionally, set up auto-recharge.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col sm:flex-row gap-8">
          {" "}
          {/* Main flex container */}
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <Label
                htmlFor="amount"
                className="text-sm font-medium text-gray-900 mb-1 block"
              >
                Amount (USD)
              </Label>
              <Input
                id="amount"
                type="number"
                min="5" // Example minimum
                value={amount}
                onChange={handleAmountChange}
                placeholder="e.g., 20"
                className="w-full"
              />
              {amount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  You will be charged ${amount.toFixed(2)}.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="auto-recharge"
                  className="text-sm font-medium text-gray-900"
                >
                  Enable Auto Recharge
                </Label>
                <Switch
                  id="auto-recharge"
                  checked={autoRechargeEnabled}
                  onCheckedChange={(checked) => {
                    setAutoRechargeEnabled(checked);
                    // If auto-recharge is disabled, no need to immediately save/update amount for it
                    // If enabled, the debounced handleSaveSettings will pick it up.
                  }}
                />
              </div>
              {/* TODO: Add inputs for threshold and recharge amount if autoRechargeEnabled is true */}
              {autoRechargeEnabled && (
                <p className="text-xs text-gray-500 mt-1">
                  Auto-recharge settings (e.g., when balance drops below X, add
                  Y) can be configured in billing settings after initial setup.
                </p>
              )}
            </div>
          </div>{" "}
          {/* End Left Column */}
          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-4">
            {currentPaymentMethod ? (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Pay With
                </h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="h-8 w-12 relative mr-3">
                        <Image
                          src={getCardIcon(currentPaymentMethod.brand)}
                          alt={currentPaymentMethod.brand}
                          width={48}
                          height={32}
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                      <div>
                        <div className="font-medium">
                          {currentPaymentMethod.brand} ••••{" "}
                          {currentPaymentMethod.last4}
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires {currentPaymentMethod.exp_month}/
                          {currentPaymentMethod.exp_year}
                        </div>
                      </div>
                    </div>
                    {!isSavingSettings && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-2"
                        onClick={() => {
                          setCurrentPaymentMethod(null); // Clear current PM to show new card form
                          setDialogClientSecret(null); // Clear previous PI client secret
                          setPaymentIntentId(null); // Clear previous PI ID
                          intentRequestedRef.current = false; // Allow new PI creation for the new card
                        }}
                      >
                        Use a different card
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : isPreparingIntent ? (
              <PaymentFormSkeleton />
            ) : dialogClientSecret || isSavingSettings ? (
              <div className="h-full max-h-[500px] overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4">
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: dialogClientSecret,
                    appearance: { theme: "flat" },
                  }}
                >
                  <AddCardForm
                    ref={addCardFormRef}
                    clientSecret={dialogClientSecret}
                    onError={setError}
                  />
                </Elements>
              </div>
            ) : (
              <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="text-sm font-medium text-red-700 mb-1">
                  Payment Setup Issue
                </h3>
                <p className="text-sm text-red-600">
                  {stripeError
                    ? "Stripe configuration error."
                    : "Could not initialize payment. Ensure amount is valid or try again."}
                </p>
              </div>
            )}
          </div>{" "}
          {/* End Right Column */}
        </div>{" "}
        {/* End Main flex container */}
        {error && (
          <div className="mt-2 flex items-center text-sm text-red-600 px-1 pb-1">
            <AlertCircle className="h-4 w-4 mr-1.5 flex-shrink-0" />
            {error}
          </div>
        )}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mt-2 sm:mt-0"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmAndPay}
            disabled={
              isLoading ||
              isPreparingIntent ||
              isSavingSettings ||
              amount <= 0 ||
              (!currentPaymentMethod && !dialogClientSecret)
            }
            className="w-full sm:w-auto"
          >
            {isLoading || isPreparingIntent
              ? "Processing..."
              : `Add $${amount.toFixed(2)} Credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
