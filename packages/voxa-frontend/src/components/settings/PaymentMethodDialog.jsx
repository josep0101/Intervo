"use client";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { useWorkspace } from "@/context/WorkspaceContext";

// Make sure the key is actually defined and not undefined
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : Promise.reject(new Error("Stripe publishable key is not defined"));

function CheckoutForm({ onSuccess, onCancel, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      // Stripe.js hasn't yet loaded or clientSecret is missing
      setErrorMessage(
        !clientSecret ? "Missing setup information from server" : null
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Submit the form before confirmSetup (required by Stripe)
    const { error: submitError } = await elements.submit();

    if (submitError) {
      setIsLoading(false);
      setErrorMessage(submitError.message);
      return;
    }

    // Proceed with confirmation after successful submission
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/settings/payment-success`,
      },
      redirect: "if_required",
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (
      setupIntent.status === "succeeded" ||
      setupIntent.status === "requires_confirmation"
    ) {
      // Payment method was successfully set up
      onSuccess && onSuccess(setupIntent);
    }
  };

  // Show error if clientSecret is missing
  useEffect(() => {
    if (!clientSecret) {
      setErrorMessage("Missing setup information from server");
    }
  }, [clientSecret]);

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: "tabs",
          defaultValues: {
            billingDetails: {
              name: "",
            },
          },
        }}
      />

      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}

      <div className="flex flex-col gap-2 mt-4">
        <Button
          type="submit"
          className="h-10"
          disabled={!stripe || isLoading || !clientSecret}
        >
          {isLoading ? "Processing..." : "Continue"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-10 border border-border"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Usage:
 * <PaymentMethodDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSuccess={handlePaymentMethodAdded}
 * />
 *
 * Note:
 * - The clientSecret is automatically fetched from the backend
 * - Payment methods available are controlled by the backend SetupIntent configuration
 * - Make sure your Stripe account has the desired payment methods enabled
 */
export default function PaymentMethodDialog({ open, onOpenChange, onSuccess }) {
  const { createSetupIntent } = useWorkspace();
  const [stripeError, setStripeError] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch client secret when dialog opens
  useEffect(() => {
    if (open && !clientSecret && !loading) {
      setLoading(true);
      setError(null);

      createSetupIntent()
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((err) => {
          console.error("Failed to create setup intent:", err);
          setError("Failed to initialize payment setup. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }

    // Reset state when dialog closes
    if (!open) {
      setClientSecret(null);
      setError(null);
    }
  }, [open, createSetupIntent]);

  // Update options to support multiple payment methods
  const options = {
    // When using clientSecret, payment method types are determined by the server
    // and we don't need to specify mode or payment_method_types
    appearance: {
      theme: "flat",
      variables: {
        colorPrimary: "#0f172a",
        colorBackground: "#ffffff",
        borderRadius: "8px",
      },
    },
    clientSecret,
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSuccess = (setupIntent) => {
    onSuccess && onSuccess(setupIntent);
    onOpenChange(false);
  };

  useEffect(() => {
    // If stripePromise rejected due to missing key, catch the error
    stripePromise.catch(() => {
      setStripeError(true);
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new payment method to your account.
          </DialogDescription>
        </DialogHeader>

        {stripeError ? (
          <div className="p-4">
            <div className="text-red-500 font-medium">Configuration Error</div>
            <p className="text-sm text-gray-700 mt-1">
              The Stripe API key is missing. Please make sure
              NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set in your environment.
            </p>
            <Button className="mt-4" onClick={handleCancel}>
              Close
            </Button>
          </div>
        ) : loading ? (
          <div className="p-4 text-center">
            <div className="text-gray-700">Initializing payment form...</div>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="text-red-500 font-medium">Error</div>
            <p className="text-sm text-gray-700 mt-1">{error}</p>
            <Button className="mt-4" onClick={handleCancel}>
              Close
            </Button>
          </div>
        ) : !clientSecret ? (
          <div className="p-4">
            <div className="text-red-500 font-medium">
              Missing Setup Information
            </div>
            <p className="text-sm text-gray-700 mt-1">
              Failed to get payment setup information from server.
            </p>
            <Button className="mt-4" onClick={handleCancel}>
              Close
            </Button>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              clientSecret={clientSecret}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
