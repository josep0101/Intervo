"use client";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react"; // Using lucide spinner as an example
import { useWorkspace } from "@/context/WorkspaceContext"; // Assuming status check is here

/**
 * PaymentProcessingScreen Component
 *
 * Displays a loading state while polling the backend to confirm subscription status.
 *
 * Props:
 * - pollInterval: (Optional) Time in ms between polling attempts (default: 2500ms).
 * - maxAttempts: (Optional) Max number of polling attempts before timeout (default: 15).
 * - onSuccess: Callback function triggered when polling confirms successful subscription.
 * - onError: Callback function triggered on polling timeout or error.
 * - flowType: (Optional) Type of payment flow (default: "subscription").
 * - paymentIntentId: (Optional) ID for PayG flow.
 */
export default function PaymentProcessingScreen({
  pollInterval = 2500,
  maxAttempts = 15, // ~37.5 seconds total timeout
  onSuccess,
  onError,
  flowType = "subscription", // Default to subscription for backward compatibility
  paymentIntentId = null, // Required if flowType is 'payg'
}) {
  const [attempts, setAttempts] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const { checkSubscriptionStatus, checkPaygPaymentStatus, workspaceId } =
    useWorkspace();

  useEffect(() => {
    // Determine the correct status check function and validate prerequisites
    let statusCheckFunction;
    if (flowType === "subscription") {
      if (!checkSubscriptionStatus) {
        console.error(
          "PaymentProcessingScreen: checkSubscriptionStatus function is missing for subscription flow."
        );
        onError(
          "Internal configuration error: Cannot check subscription status."
        );
        return;
      }
      statusCheckFunction = checkSubscriptionStatus;
    } else if (flowType === "payg") {
      if (!checkPaygPaymentStatus) {
        console.error(
          "PaymentProcessingScreen: checkPaygPaymentStatus function is missing for payg flow."
        );
        onError(
          "Internal configuration error: Cannot check PayG payment status."
        );
        return;
      }
      if (!paymentIntentId) {
        console.error(
          "PaymentProcessingScreen: paymentIntentId is missing for payg flow."
        );
        onError(
          "Configuration error: PaymentIntent ID is required for PayG status check."
        );
        return;
      }
      statusCheckFunction = () => checkPaygPaymentStatus(paymentIntentId);
    } else {
      console.error(`PaymentProcessingScreen: Invalid flowType "${flowType}"`);
      onError(`Internal configuration error: Invalid flow type specified.`);
      return;
    }

    console.log(
      `PaymentProcessingScreen: Starting polling for ${flowType} flow...`
    );

    let intervalId = null;

    const startPolling = () => {
      intervalId = setInterval(async () => {
        if (isSuccess) {
          clearInterval(intervalId);
          return;
        }

        setAttempts((prevAttempts) => {
          const currentAttempt = prevAttempts + 1;
          if (currentAttempt > maxAttempts) {
            clearInterval(intervalId);
            console.warn("PaymentProcessingScreen: Polling timed out.");
            if (!isSuccess) {
              onError(
                "Confirmation timed out. Please check your billing settings or contact support."
              );
            }
            return prevAttempts;
          }

          console.log(
            `PaymentProcessingScreen: Polling attempt ${currentAttempt} for ${flowType} flow`
          );
          statusCheckFunction()
            .then((isActive) => {
              if (isActive) {
                console.log(
                  `PaymentProcessingScreen: Status confirmed for ${flowType} flow via polling.`
                );
                clearInterval(intervalId);
                setIsSuccess(true);
              } else {
                // Continue polling - state update handled by setAttempts
              }
            })
            .catch((err) => {
              console.error(
                "PaymentProcessingScreen: Error during polling:",
                err
              );
              clearInterval(intervalId);
              if (!isSuccess) {
                onError(
                  err.message ||
                    "An error occurred while confirming your subscription."
                );
              }
            });

          return currentAttempt;
        });
      }, pollInterval);
    };

    const initialCheck = async () => {
      console.log(
        `PaymentProcessingScreen: Performing initial status check for ${flowType} flow...`
      );
      try {
        const isActive = await statusCheckFunction();
        if (isActive) {
          console.log(
            `PaymentProcessingScreen: Status confirmed for ${flowType} flow on initial check.`
          );
          setIsSuccess(true);
        } else {
          console.log(
            `PaymentProcessingScreen: Initial check for ${flowType} - Status not active yet. Starting interval polling.`
          );
          startPolling();
        }
      } catch (err) {
        console.error(
          "PaymentProcessingScreen: Error during initial check:",
          err
        );
        if (!isSuccess) {
          onError(
            err.message ||
              "An error occurred while confirming your subscription."
          );
        }
      }
      setAttempts(1);
    };

    initialCheck();

    return () => {
      if (intervalId) {
        console.log("PaymentProcessingScreen: Cleaning up polling interval.");
        clearInterval(intervalId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSuccess) {
      console.log(
        `PaymentProcessingScreen: Success state reached for ${flowType}. Setting redirect timer...`
      );
      const timer = setTimeout(() => {
        if (!workspaceId) {
          console.error(
            "PaymentProcessingScreen: Cannot redirect, workspaceId is missing!"
          );
          onError(
            "Payment successful, but failed to redirect. Please refresh."
          );
          return;
        }
        console.log(
          `PaymentProcessingScreen: Redirecting to /${workspaceId}/settings/billing...`
        );
        window.location.href = `/${workspaceId}/settings/billing`;
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isSuccess, workspaceId, onError]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center text-card-foreground w-96 text-center">
        {isSuccess ? (
          <>
            <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
            <p className="text-sm text-muted-foreground">
              {flowType === "subscription"
                ? "Your subscription is active."
                : "Your payment is confirmed."}
              Redirecting you to the billing overview...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">
              {flowType === "subscription"
                ? "Confirming Subscription..."
                : "Confirming Payment..."}
            </h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we securely confirm your{" "}
              {flowType === "subscription" ? "subscription" : "payment"}.
              <br />
              This may take a few moments. Do not close this window.
            </p>
            {/* Optional: Display polling attempts */}
            {/* <p className="text-xs text-muted-foreground mt-4">Attempt: {attempts}/{maxAttempts}</p> */}
          </>
        )}
      </div>
    </div>
  );
}
