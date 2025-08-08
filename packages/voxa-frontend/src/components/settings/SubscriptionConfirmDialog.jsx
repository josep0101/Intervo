"use client";
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  memo,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useWorkspace } from "@/context/WorkspaceContext";
import PaymentProcessingScreen from "./PaymentProcessingScreen";

// Custom hook to log prop/state changes
function useWhyDidYouUpdate(name, props) {
  const previousProps = useRef();

  useEffect(() => {
    if (previousProps.current) {
      // Get keys of previous and current props
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      // Use this object to keep track of changed props
      const changesObj = {};
      // Iterate through keys
      allKeys.forEach((key) => {
        // If prop is not function or changed
        if (
          typeof props[key] !== "function" &&
          previousProps.current[key] !== props[key]
        ) {
          changesObj[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
        // Special handling for functions (e.g., callbacks) to see if they changed reference
        else if (
          typeof props[key] === "function" &&
          previousProps.current[key]?.toString() !== props[key]?.toString()
        ) {
          changesObj[key] = {
            from: `function ${previousProps.current[key]?.name || "anonymous"}`,
            to: `function ${
              props[key]?.name || "anonymous"
            } (reference changed)`,
          };
        }
      });

      // If changesObj is not empty, log to console
      if (Object.keys(changesObj).length) {
        console.log("[WhyDidYouUpdate]", name, changesObj);
      }
    }

    // Finally update previousProps with current props for next hook call
    previousProps.current = props;
  }); // Runs on every render
}

/**
 * Usage:
 * <SubscriptionConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSuccess={handleSubscriptionConfirmed}
 *   plan={{
 *     name: "Business Plan",
 *     type: "yearly",
 *     price: 199,
 *   }}
 *   paymentMethod={{
 *     id: "pm_1234",
 *     brand: "visa",
 *     last4: "4242",
 *     expMonth: 12,
 *     expYear: 2025
 *   }}
 * />
 */
export default function SubscriptionConfirmDialog({
  open,
  onOpenChange,
  onSuccess,
  plan,
  paymentMethod,
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stripeError, setStripeError] = useState(false);
  const { prepareSubscriptionIntent } = useWorkspace();
  const [dialogClientSecret, setDialogClientSecret] = useState(null);
  const [isPreparingIntent, setIsPreparingIntent] = useState(false);
  const [isAwaitingBackendConfirmation, setIsAwaitingBackendConfirmation] =
    useState(false);
  const intentRequestedRef = useRef(false);

  // --- Debug Hook Call ---
  useWhyDidYouUpdate("SubscriptionConfirmDialog", {
    // Props
    open,
    onOpenChange,
    onSuccess,
    plan,
    paymentMethod,
    // State
    isLoading,
    error,
    stripeError,
    dialogClientSecret,
    isPreparingIntent,
    isAwaitingBackendConfirmation,
    // Context values (if relevant to re-renders)
    prepareSubscriptionIntent,
  });
  // --- End Debug Hook Call ---

  // Card brand icons from flat-rounded directory
  const CARD_ICONS = {
    visa: "/images/payment/flat-rounded/visa.svg",
    mastercard: "/images/payment/flat-rounded/mastercard.svg",
    amex: "/images/payment/flat-rounded/amex.svg",
    discover: "/images/payment/flat-rounded/discover.svg",
    diners: "/images/payment/flat-rounded/diners.svg",
    jcb: "/images/payment/flat-rounded/jcb.svg",
    unionpay: "/images/payment/flat-rounded/unionpay.svg",
    unknown: "/images/payment/flat-rounded/generic.svg",
  };

  const getCardIcon = (cardBrand) => {
    if (!cardBrand) return CARD_ICONS.unknown;
    const normalizedBrand = cardBrand.toLowerCase();
    return CARD_ICONS[normalizedBrand] || CARD_ICONS.unknown;
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Format pricing for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Format the billing cycle text
  const getBillingCycleText = () => {
    if (plan.type === "yearly") return "Yearly billing";
    if (plan.type === "monthly") return "Monthly billing";
    return "Pay as you go";
  };

  const getNextBillingDate = () => {
    const today = new Date();
    const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
    return nextMonth.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // --- Stripe Initialization (Module Level) ---
  // Ensures loadStripe is called only once per module load.
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripePromise = stripePublishableKey
    ? loadStripe(stripePublishableKey)
    : Promise.reject(
        new Error(
          "Stripe publishable key is not defined - Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        )
      );
  // --- End Stripe Initialization ---

  // Stripe Form Component
  const AddCardForm = forwardRef(
    ({ clientSecret, onSetupComplete, onError }, ref) => {
      const stripe = useStripe();
      const elements = useElements();
      const [isProcessing, setIsProcessing] = useState(false);
      const [formError, setFormError] = useState(null);

      // --- NEW: Function to handle confirmPayment ---
      const handleConfirmPayment = async () => {
        if (!stripe || !elements) {
          console.error("Stripe.js has not loaded yet.");
          onError(
            "Payment components are not ready. Please wait a moment and try again."
          );
          return; // Indicate failure or prevent parent isLoading state change
        }

        console.log("Calling stripe.confirmPayment...");
        setFormError(null); // Clear previous errors specific to the form
        // Parent should already have set isLoading=true

        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            // Make sure to change this to your payment completion page
            return_url: `${window.location.origin}/subscription-status`, // Use configured return URL
          },
          redirect: "if_required", // Redirect only if necessary for authentication
        });

        // This point will only be reached if there is an immediate error or
        // if redirect: 'if_required' is used and authentication is NOT required.
        if (error) {
          if (
            error.type === "card_error" ||
            error.type === "validation_error"
          ) {
            setFormError(error.message);
            onError(error.message); // Propagate error to parent dialog
          } else {
            console.error("Unexpected Stripe error:", error);
            setFormError(
              "An unexpected error occurred during payment confirmation."
            );
            onError("An unexpected error occurred. Please try again."); // Propagate generic error
          }
          // Indicate failure to parent so it can set isLoading=false
          return { error: true };
        } else {
          // If we reach here without an error AND no redirect happened,
          // the payment succeeded (or requires_action handled implicitly).
          // The subscription is created via webhook. Parent might show processing.
          console.log(
            "confirmPayment finished without immediate error or redirect."
          );
          // Parent's onSuccess will likely be triggered based on webhook or polling,
          // not directly from here in most cases.
          // Return success indication if needed by parent's logic flow
          return { success: true };
        }
      };

      const handleSubmitForSetup = async () => {
        if (!stripe || !elements || !clientSecret) {
          onError("Stripe is not loaded or setup information is missing.");
          return null;
        }

        setIsProcessing(true);
        setFormError(null);

        const { error: submitError } = await elements.submit();
        if (submitError) {
          setIsProcessing(false);
          setFormError(submitError.message);
          onError(submitError.message);
          return null;
        }

        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/setup-intent-return`,
          },
          redirect: "if_required",
        });

        setIsProcessing(false);

        if (error) {
          setFormError(error.message);
          onError(error.message);
          return null;
        } else if (setupIntent?.status === "succeeded") {
          onSetupComplete(setupIntent);
          return setupIntent.payment_method;
        } else if (setupIntent?.status === "requires_confirmation") {
          const msg = "Further confirmation needed from your bank.";
          setFormError(msg);
          onError(msg);
          return null;
        } else {
          const msg =
            "Payment setup failed. Please try again or contact support.";
          setFormError(msg);
          onError(msg);
          return null;
        }
      };

      useImperativeHandle(ref, () => ({
        // Expose the new confirmPayment handler
        submitAndConfirmPayment: handleConfirmPayment,
        // Keep submitAndSetup if it's still needed elsewhere, otherwise remove
        // submitAndSetup: handleSubmitForSetup,
      }));

      return (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Add Payment Method
          </h3>
          <PaymentElement
            options={{
              layout: "tabs",
              defaultValues: { billingDetails: { name: "" } },
            }}
          />
          {formError && (
            <div className="text-red-500 text-sm mt-2">{formError}</div>
          )}
        </div>
      );
    }
  );
  AddCardForm.displayName = "AddCardForm";

  // Stripe Elements Options
  const stripeOptions = useMemo(
    () =>
      dialogClientSecret
        ? {
            clientSecret: dialogClientSecret,
            appearance: {
              theme: "flat",
              variables: {
                colorPrimary: "#0f172a",
                colorBackground: "#ffffff",
                borderRadius: "8px",
              },
            },
          }
        : {},
    [dialogClientSecret]
  );

  // Callback from AddCardForm on successful setup
  const handleCardSetupComplete = async (setupIntent) => {
    console.log("Card setup successful:", setupIntent);
    const newPaymentMethodId = setupIntent.payment_method;

    if (!newPaymentMethodId) {
      setError("Failed to get payment method ID after setup.");
      setIsLoading(false);
      return;
    }

    // setIsLoading(true);
    setError(null);
    try {
      console.log(
        `Calling API to create subscription for plan ${plan?.type} with NEW payment method ${newPaymentMethodId}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onSuccess && onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create subscription after card setup:", err);
      setError(
        err.message || "Failed to create subscription. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Callback from AddCardForm on error during setup
  const handleCardSetupError = (errorMessage) => {
    setError(errorMessage || "Failed to set up payment method.");
    setIsLoading(false);
  };

  // Check for stripe key errors on mount
  useEffect(() => {
    stripePromise.catch(() => {
      setStripeError(true);
      setError("Stripe configuration error: Publishable key might be missing.");
    });
  }, []);

  // Ref for AddCardForm
  const addCardFormRef = useRef();

  // Effect to prepare the Payment Intent when adding a new card
  useEffect(() => {
    // Only run if dialog is open, have priceId, AND no secret yet fetched AND intent not yet requested
    // TEMPORARILY MODIFIED: Always behaves as if !paymentMethod is true to force new card entry.
    if (
      open &&
      // !paymentMethod && // Original condition part temporarily overridden for new card flow
      true && // This ensures the logic proceeds as if no paymentMethod was provided for PI creation
      plan?.priceId &&
      !dialogClientSecret &&
      !intentRequestedRef.current // <-- Check the ref
    ) {
      console.log(
        "Dialog open for new card subscription, preparing intent... (Strictly Once via Ref)"
      );
      setIsPreparingIntent(true);
      setError(null);
      setStripeError(false);
      intentRequestedRef.current = true; // <-- Set the flag immediately

      prepareSubscriptionIntent(plan.priceId)
        .then((data) => {
          console.log("Received client secret:", data?.clientSecret);
          if (!data?.clientSecret) {
            throw new Error("Client secret was not received from server.");
          }
          setDialogClientSecret(data.clientSecret);
        })
        .catch((err) => {
          console.error("Failed to prepare subscription intent:", err);
          setError(
            err.message ||
              "Failed to initialize payment. Please close and try again."
          );
          setStripeError(true);
          intentRequestedRef.current = false; // Reset flag on error so retry is possible if dialog stays open
        })
        .finally(() => {
          setIsPreparingIntent(false);
          // Ref remains true until dialog closes or error occurs
        });
    } else if (!open) {
      // Reset state AND ref when dialog closes
      setDialogClientSecret(null);
      setError(null);
      setIsPreparingIntent(false);
      setStripeError(false);
      intentRequestedRef.current = false; // <-- Reset the flag
    }
    // Dependencies: Keep prepareSubscriptionIntent as it's from context
  }, [
    open,
    // paymentMethod, // Temporarily remove paymentMethod from deps for this effect to force new card path
    plan?.priceId,
    prepareSubscriptionIntent,
    dialogClientSecret,
  ]);

  const finalHandleConfirmClick = async () => {
    try {
      // Case 1: Using an existing payment method
      if (paymentMethod) {
        // setIsLoading(true); // Set loading only when starting the action
        setError(null);
        try {
          console.log(
            `Simulating subscription success with EXISTING payment method ${paymentMethod.id}`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

          onSuccess && onSuccess(); // Call the success handler passed in props
          onOpenChange(false);
          // No need to set isLoading false, component unmounts
        } catch (err) {
          console.error(
            "Failed to process subscription with existing card:",
            err
          );
          setError(
            err.message || "Failed to process subscription. Please try again."
          );
          setIsLoading(false); // Stop loading on error
        }
      }
      // Case 2: Adding a new card using fetched dialogClientSecret
      else if (dialogClientSecret && addCardFormRef.current) {
        // Don't set isLoading here yet. Let the confirmPayment call start.
        setError(null); // Clear previous errors before attempting
        try {
          console.log("Attempting to confirm payment via AddCardForm ref...");
          const result = await addCardFormRef.current.submitAndConfirmPayment();

          // If confirmPayment resulted in an *immediate* error (no redirect),
          // AddCardForm's handler would have called onError and returned { error: true }.
          if (result?.error) {
            console.log(
              "Immediate error detected after confirmPayment attempt."
            );
            // Error state is already set by onError callback.
            setIsLoading(false);
          } else {
            // No immediate error, Stripe is processing or redirecting.
            // Instead of setting loading or timeout, trigger the processing screen.
            console.log(
              "No immediate error from confirmPayment. Initiating backend confirmation polling."
            );
            // No need to set isLoading here, the processing screen handles visual state
            // --- Introduce minimal delay before switching components ---
            setTimeout(() => {
              setIsAwaitingBackendConfirmation(true); // <-- Show the processing screen after a micro-task delay
            }, 0);
            // --- End minimal delay ---
          }
        } catch (err) {
          // Catch errors related to *calling* the ref function itself
          console.error(
            "Error triggering submitAndConfirmPayment via ref:",
            err
          );
          setError("Failed to initiate payment method setup.");
          setIsLoading(false); // Stop loading on trigger error
        }
      } else {
        // Handle case where button clicked but conditions not met (should be disabled, but belt-and-suspenders)
        console.warn(
          "Confirm clicked but no payment method or client secret available."
        );
        setError("Missing payment method or setup information.");
        setIsLoading(false); // Stop loading if nothing to do
      }
    } catch (err) {
      // Catch any unexpected errors during the logic before async calls
      console.error("Unexpected error in finalHandleConfirmClick setup:", err);
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  // --- Callbacks for PaymentProcessingScreen ---
  const handlePollingSuccess = () => {
    console.log("handlePollingSuccess: Backend confirmed subscription.");
    setIsAwaitingBackendConfirmation(false); // Hide processing screen
    onSuccess && onSuccess(); // Call the original success handler
    onOpenChange(false); // Close the dialog
  };

  const handlePollingError = (errorMessage) => {
    console.error("handlePollingError: Polling failed or timed out.");
    setIsAwaitingBackendConfirmation(false); // Hide processing screen
    setError(
      errorMessage ||
        "Failed to confirm subscription status. Please check billing or contact support."
    );
    setIsLoading(false); // Ensure loading state is off if polling fails
  };
  // --- End Callbacks ---

  useEffect(() => {
    console.log("stripe subscription mounted");

    return () => {
      console.log("stripe subscription unmounted");
    };
  }, []);
  console.log(
    dialogClientSecret,
    "dialogclientSecret stripe subscription rerender"
  );

  // --- Render Logic ---
  // If awaiting backend confirmation, show the processing screen overlay
  if (isAwaitingBackendConfirmation) {
    return (
      <PaymentProcessingScreen
        onSuccess={handlePollingSuccess}
        onError={handlePollingError}
      />
    );
  }

  // Otherwise, render the Dialog as usual
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Confirm Subscription</DialogTitle>
          <DialogDescription>
            Review your subscription details before confirming.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col sm:flex-row gap-6">
          {" "}
          {/* Main flex container */}
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Plan details */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Plan Details
              </h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">
                        {plan?.name || "Business Plan"}
                      </h4>
                      <div className="text-sm text-gray-500">
                        {getBillingCycleText()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-900"
                    >
                      Recommended
                    </Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 text-lg font-semibold">
                    {formatPrice(plan?.price || 199)}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      {plan?.type === "yearly" ? "per year" : "per month"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing information */}
            <div className="text-sm text-gray-500">
              <p>
                You will be charged {formatPrice(plan?.price || 199)} today. The
                next billing date will be {getNextBillingDate()}.
              </p>
              <p className="mt-1">
                You can cancel or change your subscription at any time from the
                billing settings.
              </p>
            </div>
          </div>{" "}
          {/* End Left Column */}
          {/* Right Column */}
          <div className="flex-1">
            {/* Payment method or Add Card Form */}
            {/* TEMPORARILY MODIFIED: Always show new card form by making `paymentMethod` effectively null for this render block */}
            {false && paymentMethod ? ( // Original: paymentMethod
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Payment Method
                </h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="h-8 w-12 relative mr-2">
                        <Image
                          src={getCardIcon(paymentMethod?.brand)}
                          alt={`${paymentMethod?.brand || "Card"}`}
                          width={48}
                          height={32}
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                      <div>
                        <div className="font-medium">
                          {paymentMethod?.brand || "Card"} ••••{" "}
                          {paymentMethod?.last4 || "4242"}
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires {paymentMethod?.expMonth || "12"}/
                          {paymentMethod?.expYear || "2025"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : isPreparingIntent ? (
              <div className="p-4 text-center">
                <div className="text-gray-700">
                  Initializing payment form...
                </div>
              </div>
            ) : dialogClientSecret ? (
              <div className="h-full max-h-[500px] overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4">
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <AddCardForm
                    ref={addCardFormRef}
                    clientSecret={dialogClientSecret}
                    onSetupComplete={handleCardSetupComplete}
                    onError={handleCardSetupError}
                  />
                </Elements>
              </div>
            ) : (
              <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="text-sm font-medium text-red-700 mb-1">
                  Payment Setup Error
                </h3>
                <p className="text-sm text-red-600">
                  {stripeError
                    ? "Stripe configuration error. Check API keys."
                    : "Could not initialize payment form. Please try again later."}
                </p>
              </div>
            )}
          </div>{" "}
          {/* End Right Column */}
        </div>{" "}
        {/* End Main flex container */}
        {/* Error message (spans full width below columns) */}
        {error && (
          <div className="mt-3 flex items-center text-sm text-red-600 px-1 pb-2">
            {" "}
            {/* Added padding */}
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="mt-2 sm:mt-0"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={finalHandleConfirmClick}
            disabled={
              isLoading ||
              isPreparingIntent ||
              (!paymentMethod && !dialogClientSecret) ||
              stripeError
            }
            className="w-full sm:w-auto"
          >
            {isLoading || isPreparingIntent
              ? "Processing..."
              : "Confirm Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
