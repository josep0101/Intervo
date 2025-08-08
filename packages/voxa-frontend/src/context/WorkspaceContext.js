"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import returnAPIUrl from "@/config/config";
import { useRouter } from "next/navigation";
import PricingPopup from "@/components/PricingPopup";

const backendAPIUrl = returnAPIUrl();
//const backendAPIUrl = "http://localhost:3003";

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [workspaceInfo, setWorkspaceInfo] = useState({});
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [memberWorkspaces, setMemberWorkspaces] = useState([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const router = useRouter();

  // New state for timezones
  const [availableTimezones, setAvailableTimezones] = useState([]);
  const [timezonesLoading, setTimezonesLoading] = useState(false);
  const [timezonesError, setTimezonesError] = useState(null);

  // New state for pricing popup
  const [isPricingPopupOpen, setIsPricingPopupOpen] = useState(false);

  useEffect(() => {
    fetchWorkspaceInfo();
    // Fetch timezones when workspaceId is available or on initial load if desired
    // For now, let's fetch when workspaceId is set, implying a workspace context is active
    if (workspaceId) {
      fetchTimezones();
    }
  }, [workspaceId]);

  useEffect(() => {
    const fetchSubDetails = async () => {
      if (!workspaceId) {
        console.log(
          "fetchSubDetails: Skipping, workspaceId not available yet."
        );
        setSubscriptionDetails(null);
        return;
      }

      console.log(
        `Fetching subscription details for workspace: ${workspaceId}`
      );
      setSubscriptionLoading(true);
      setSubscriptionDetails(null);
      try {
        const response = await fetch(
          `${backendAPIUrl}/billing/plan-details?workspaceId=${workspaceId}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.warn(
            `Subscription details fetch returned: ${response.status}`
          );
          setSubscriptionDetails({
            isActive: false,
            status: `error_${response.status}`,
          });
        } else {
          const data = await response.json();
          if (typeof data.isActive !== "boolean") {
            console.error(
              "Invalid response format from /billing/subscription-details",
              data
            );
            setSubscriptionDetails({ isActive: false, status: "invalid_data" });
          } else {
            console.log("Subscription details fetched:", data);
            setSubscriptionDetails(data);
          }
        }
      } catch (error) {
        console.error("Error fetching subscription details:", error);
        setSubscriptionDetails({ isActive: false, status: "fetch_error" });
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubDetails();
  }, [workspaceId]);

  const fetchWorkspaceInfo = async () => {
    setWorkspaceLoading(true);
    try {
      const response = await fetch(`${backendAPIUrl}/workspace`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch workspace information");
      }
      const data = await response.json();
      setWorkspaceInfo(data?.currentWorkspace);
      console.log(data?.currentWorkspace);
      setWorkspaceId(data?.currentWorkspace?._id);
      setMemberWorkspaces(data?.memberWorkspaces);
      return data?.currentWorkspace;
    } catch (error) {
      console.error("Error fetching workspace:", error);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const updateWorkspaceInformation = async (data) => {
    try {
      const response = await fetch(`${backendAPIUrl}/workspace`, {
        credentials: "include",
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update workspace information");
      } else {
        return { message: "Workspace updated" };
      }
    } catch (error) {
      console.error("Error updating workspace:", error);
      return { error };
    }
  };

  const handleWorkspaceChange = async (workspaceId) => {
    setWorkspaceId(workspaceId);
    const response = await fetch(
      `${backendAPIUrl}/workspace/change-workspace`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId }),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to change workspace");
    }
    const data = await response.json();
    setWorkspaceInfo(data?.currentWorkspace);
    router.push(`/${workspaceId}/studio`);
  };

  const fetchWorkspaceUsers = async (page) => {
    try {
      const response = await fetch(
        `${backendAPIUrl}/workspace/users?page=${page}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch workspace users");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching workspace users", error);
      return { error };
    }
  };

  const inviteUserToWorkspace = async (data) => {
    try {
      const response = await fetch(`${backendAPIUrl}/workspace/invite`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating workspace:", error);
      return { error };
    }
  };

  const editWorkspaceUser = async (data) => {
    try {
      const response = await fetch(`${backendAPIUrl}/workspace/users`, {
        credentials: "include",

        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(data),
      });

      return response.json();
    } catch (error) {
      console.error("Error updating user:", error);

      return { error };
    }
  };

  const deleteWorkspaceUser = async (data) => {
    try {
      const response = await fetch(`${backendAPIUrl}/workspace/delete-user`, {
        credentials: "include",

        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(data),
      });

      return response.json();
    } catch (error) {
      console.error("Error deleting user:", error);

      return { error };
    }
  };

  const createWorkspace = async (data) => {
    try {
      const response = await fetch(`${backendAPIUrl}/workspace`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      console.error("Error creating workspace:", error);
      return { error };
    }
  };

  const deleteWorkspace = async (workspaceId) => {
    try {
      const response = await fetch(
        `${backendAPIUrl}/workspace/${workspaceId}`,
        {
          credentials: "include",
          method: "DELETE",
        }
      );
      return response.json();
    } catch (error) {
      console.error("Error deleting workspace:", error);
      return { error };
    }
  };

  // Function to resolve invite token to workspaceId
  const resolveInviteToken = async (token) => {
    if (!token) {
      throw new Error("No invitation token provided.");
    }
    try {
      const response = await fetch(
        `${backendAPIUrl}/workspace/invitations/resolve?token=${token}`,
        {
          credentials: "include", // Important for sending cookies/auth info
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error resolving token." }));
        console.error("API Error resolving token:", response.status, errorData);
        throw new Error(
          errorData.message ||
            `Failed to resolve invitation token (Status: ${response.status})`
        );
      }

      const data = await response.json();

      if (!data.workspaceId) {
        console.error(
          "API Error: No workspaceId in response from /invitations/resolve"
        );
        throw new Error("Invalid invitation data received from server.");
      }

      return data.workspaceId; // Return the workspaceId on success
    } catch (error) {
      console.error("Network/fetch error in resolveInviteToken:", error);
      // Re-throw the error so the component can catch it
      throw error;
    }
  };

  // Function to accept a workspace invite using workspaceId and token
  const acceptWorkspaceInvite = async (inviteWorkspaceId, token) => {
    if (!inviteWorkspaceId) {
      throw new Error("No workspace ID provided to accept invite.");
    }
    if (!token) {
      throw new Error("No token provided to accept invite.");
    }
    try {
      // Note: The backend endpoint uses req.user.id, so we don't need to send it.
      // It identifies the user via the included credentials (cookies).
      const response = await fetch(
        `${backendAPIUrl}/workspace/accept-invite/${inviteWorkspaceId}`,
        {
          method: "POST",
          credentials: "include", // Crucial for identifying the logged-in user
          headers: {
            // Added Content-Type header because we are sending a JSON body
            "Content-Type": "application/json",
          },
          // Added token to the request body
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error accepting invite." }));
        console.error(
          "API Error accepting invite:",
          response.status,
          errorData
        );
        throw new Error(
          errorData.message ||
            `Failed to accept invitation (Status: ${response.status})`
        );
      }

      const data = await response.json();

      // Optional: Re-fetch workspace info or update state after successful invite acceptance
      await fetchWorkspaceInfo(); // Refresh user's workspace list/current workspace

      return data; // Return success message or data from backend
    } catch (error) {
      console.error("Network/fetch error in acceptWorkspaceInvite:", error);
      // Re-throw the error so the component can catch it
      throw error;
    }
  };

  // Billing API functions

  const createSetupIntent = async () => {
    try {
      const response = await fetch(
        `${backendAPIUrl}/billing/create-setup-intent`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to create setup intent" }));
        throw new Error(
          errorData.message ||
            `Failed to create setup intent (Status: ${response.status})`
        );
      }

      const data = await response.json();
      return data; // Returns { clientSecret, setupIntentId }
    } catch (error) {
      console.error("Error creating setup intent:", error);
      throw error;
    }
  };

  const getPaymentMethods = async () => {
    try {
      // Include workspaceId as a query parameter
      const response = await fetch(
        `${backendAPIUrl}/billing/payment-methods?workspaceId=${workspaceId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to fetch payment methods" }));
        throw new Error(
          errorData.message ||
            `Failed to fetch payment methods (Status: ${response.status})`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      throw error;
    }
  };

  const deletePaymentMethod = async (paymentMethodId) => {
    if (!workspaceId) {
      throw new Error("Workspace ID is required to delete a payment method");
    }

    try {
      const response = await fetch(`${backendAPIUrl}/billing/payment-methods`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethodId,
          workspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to delete payment method" }));
        throw new Error(
          errorData.message ||
            `Failed to delete payment method (Status: ${response.status})`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      throw error;
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId) => {
    if (!workspaceId) {
      throw new Error("Workspace ID is required to set default payment method");
    }

    try {
      const response = await fetch(
        `${backendAPIUrl}/billing/payment-methods/default`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethodId,
            workspaceId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to set default payment method" }));
        throw new Error(
          errorData.message ||
            `Failed to set default payment method (Status: ${response.status})`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error setting default payment method:", error);
      throw error;
    }
  };

  const getSubscription = async () => {
    try {
      const response = await fetch(
        `${backendAPIUrl}/api/billing/subscription`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching subscription:", error);
      throw error;
    }
  };

  // Prepare Payment Intent for subscription setup with Elements
  const prepareSubscriptionIntent = async (priceId) => {
    if (!workspaceId) {
      throw new Error(
        "Workspace ID is required to prepare a subscription intent"
      );
    }
    if (!priceId) {
      throw new Error("Price ID is required to prepare a subscription intent");
    }

    try {
      const response = await fetch(
        `${backendAPIUrl}/billing/prepare-subscription-intent`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId, priceId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to prepare subscription payment intent",
        }));
        throw new Error(
          errorData.message ||
            `Failed to prepare subscription payment intent (Status: ${response.status})`
        );
      }

      const data = await response.json();
      return data; // Returns { clientSecret }
    } catch (error) {
      console.error("Error preparing subscription intent:", error);
      throw error; // Re-throw for the component to handle
    }
  };

  // --- NEW: Function to check subscription status ---
  const checkSubscriptionStatus = async () => {
    if (!workspaceId) {
      console.error("checkSubscriptionStatus: workspaceId not available.");
      // Return false or throw error based on how you want to handle this
      // Returning false might be safer for the polling component initially
      return false;
    }

    console.log(`Checking subscription status for workspace: ${workspaceId}`);
    try {
      const response = await fetch(
        // IMPORTANT: Endpoint needs to be created on the backend
        `${backendAPIUrl}/billing/subscription-status?workspaceId=${workspaceId}`,
        {
          method: "GET", // Use GET for fetching status
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        // Handle non-2xx responses (like 404 if no subscription found yet)
        // Decide if this should be treated as an error or just "not active"
        console.warn(`Subscription status check returned: ${response.status}`);
        // For polling, we often treat 'not found' as 'not active yet'
        if (response.status === 404) {
          return false; // Treat not found as inactive for polling purposes
        }
        // For other errors, throw to trigger onError in the polling component
        const errorData = await response.json().catch(() => ({
          message: "Failed to check subscription status",
        }));
        throw new Error(
          errorData.message ||
            `Failed to check subscription status (Status: ${response.status})`
        );
      }

      const data = await response.json();
      // Expecting backend to return { isActive: boolean }
      if (typeof data.isActive !== "boolean") {
        console.error(
          "Invalid response format from /billing/subscription-status. Expected { isActive: boolean }.",
          data
        );
        throw new Error(
          "Received invalid data while checking subscription status."
        );
      }

      console.log(`Subscription status isActive: ${data.isActive}`);
      return data.isActive; // Return the boolean status
    } catch (error) {
      console.error("Error checking subscription status:", error);
      // Re-throw the error so the polling component can catch it and trigger onError
      throw error;
    }
  };
  // --- END: New function ---

  // --- NEW: Function to create Stripe Customer Portal Session ---
  const createCustomerPortalSession = async () => {
    if (!workspaceId) {
      console.error("createCustomerPortalSession: workspaceId not available.");
      // Optionally throw an error or display a message to the user
      throw new Error("Cannot manage billing without a workspace context.");
    }

    console.log(
      `Requesting customer portal session for workspace: ${workspaceId}`
    );
    try {
      const response = await fetch(
        // Assuming the endpoint is at /billing based on previous patterns
        `${backendAPIUrl}/billing/create-portal-session`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId }), // Send workspaceId if needed by backend
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to create customer portal session",
        }));
        console.error(
          "Error creating portal session:",
          response.status,
          errorData
        );
        throw new Error(
          errorData.message ||
            `Failed to open billing management (Status: ${response.status})`
        );
      }

      const data = await response.json();

      // Expecting backend to return { url: string }
      if (data && data.url) {
        console.log("Redirecting to Stripe Customer Portal...");
        // Redirect the user's browser to the Stripe portal URL
        window.location.href = data.url;
      } else {
        console.error(
          "Invalid response format from /billing/create-portal-session. Expected { url: string }.",
          data
        );
        throw new Error("Failed to get billing management URL.");
      }
      // No return needed as we are redirecting
    } catch (error) {
      console.error("Error requesting customer portal session:", error);
      // Re-throw the error so the calling component can potentially display it
      throw error;
    }
  };
  // --- END: New function ---

  // --- NEW: Function to fetch paginated invoices ---
  const fetchInvoices = async ({ limit = 10, startingAfter = null }) => {
    if (!workspaceId) {
      console.error("fetchInvoices: workspaceId not available.");
      throw new Error("Cannot fetch invoices without a workspace context.");
    }

    const params = new URLSearchParams({
      workspaceId,
      limit: limit.toString(),
    });
    if (startingAfter) {
      params.append("starting_after", startingAfter);
    }

    console.log(
      `Fetching invoices for workspace ${workspaceId} with params: ${params.toString()}`
    );
    try {
      const response = await fetch(
        `${backendAPIUrl}/billing/invoices?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to fetch invoices",
        }));
        console.error("Error fetching invoices:", response.status, errorData);
        throw new Error(
          errorData.message ||
            `Failed to fetch invoices (Status: ${response.status})`
        );
      }

      const data = await response.json();
      // Validate response structure slightly
      if (
        !data ||
        !Array.isArray(data.invoices) ||
        typeof data.has_more !== "boolean"
      ) {
        console.error("Invalid response format from /billing/invoices", data);
        throw new Error("Received invalid data when fetching invoices.");
      }

      console.log(
        `Fetched ${data.invoices.length} invoices. Has more: ${data.has_more}`
      );
      // Returns { invoices: [], has_more: boolean, next_page_token: string | null }
      return data;
    } catch (error) {
      console.error("Error during fetchInvoices call:", error);
      // Re-throw the error so the calling component can handle it
      throw error;
    }
  };
  // --- END: New function ---

  // --- NEW: Function to create a Payment Intent for one-time payment ---
  const createOneTimePaymentIntent = async (amountInCents) => {
    if (!workspaceId) {
      throw new Error(
        "Workspace ID is required to create a one-time payment intent"
      );
    }
    if (!amountInCents || amountInCents <= 0) {
      throw new Error("A valid amount is required for the payment intent");
    }

    console.log(
      `Creating one-time payment intent for ${amountInCents} cents for workspace: ${workspaceId}`
    );
    try {
      const response = await fetch(
        `${backendAPIUrl}/billing/create-payment-intent`, // Ensure this endpoint exists
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspaceId,
            amount: amountInCents,
            currency: "usd",
            intentType: "pay_as_you_go_top_up", // <--- This is the key for PAYG
            description: "Pay As You Go Credit Top-up", // Optional: a description for the charge
          }), // Assuming backend expects 'amount' in cents
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to create one-time payment intent",
        }));
        throw new Error(
          errorData.message ||
            `Failed to create one-time payment intent (Status: ${response.status})`
        );
      }

      const data = await response.json();
      console.log("One-time payment intent created:", data);
      return data; // Expects { clientSecret: string, paymentIntentId: string }
    } catch (error) {
      console.error("Error creating one-time payment intent:", error);
      throw error;
    }
  };
  // --- END: New function ---

  // --- NEW: Function to update auto-recharge settings ---
  const updateAutoRechargeSettings = async (settings) => {
    if (!workspaceId) {
      throw new Error(
        "Workspace ID is required to update auto-recharge settings"
      );
    }
    // Validate settings object if necessary
    // e.g., if (!settings || typeof settings.isEnabled !== 'boolean') {
    //   throw new Error("Invalid settings provided for auto-recharge");
    // }

    console.log(
      `Updating auto-recharge settings for workspace ${workspaceId}:`,
      settings
    );
    try {
      const response = await fetch(
        `${backendAPIUrl}/billing/auto-recharge-settings`, // Ensure this endpoint exists
        {
          method: "PUT", // Or POST, depending on your API design
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId, ...settings }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Failed to update auto-recharge settings",
        }));
        throw new Error(
          errorData.message ||
            `Failed to update auto-recharge settings (Status: ${response.status})`
        );
      }

      const data = await response.json();
      console.log("Auto-recharge settings updated response:", data);

      // --- BEGIN: Update local subscriptionDetails state ---
      if (data && data.updatedSettings) {
        setSubscriptionDetails((prevDetails) => {
          // Ensure prevDetails and prevDetails.autoRecharge are not null
          const currentAutoRecharge = prevDetails?.autoRecharge || {};
          const newAutoRecharge = {
            ...currentAutoRecharge,
            ...data.updatedSettings,
          };
          return {
            ...prevDetails,
            autoRecharge: newAutoRecharge,
          };
        });
        console.log(
          "Local subscriptionDetails updated with new auto-recharge settings."
        );
      }
      // --- END: Update local subscriptionDetails state ---

      return data; // Returns success message or updated settings
    } catch (error) {
      console.error("Error updating auto-recharge settings:", error);
      throw error;
    }
  };
  // --- END: New function ---

  // --- NEW: Function to check Pay As You Go Payment Intent status ---
  const checkPaygPaymentStatus = async (paymentIntentId) => {
    if (!workspaceId) {
      console.error("checkPaygPaymentStatus: workspaceId not available.");
      return false; // Or throw error, returning false for polling safety
    }
    if (!paymentIntentId) {
      console.error("checkPaygPaymentStatus: paymentIntentId not provided.");
      return false; // Or throw error
    }

    console.log(
      `Checking PayG payment status for PI: ${paymentIntentId} in workspace: ${workspaceId}`
    );
    try {
      const response = await fetch(
        `${backendAPIUrl}/billing/payg-status?workspaceId=${workspaceId}&paymentIntentId=${paymentIntentId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn(`PayG payment status check returned: ${response.status}`);
        if (response.status === 404) {
          return false; // Treat not found as not yet succeeded for polling
        }
        const errorData = await response.json().catch(() => ({
          message: "Failed to check PayG payment status",
        }));
        throw new Error(
          errorData.message ||
            `Failed to check PayG payment status (Status: ${response.status})`
        );
      }

      const data = await response.json();
      // Assuming backend returns { isActive: boolean } similar to subscription for simplicity
      // or { succeeded: boolean } or { creditsApplied: boolean }
      // For consistency with PaymentProcessingScreen, let's use 'isActive' if possible from backend.
      if (typeof data.isActive !== "boolean") {
        console.error(
          "Invalid response from /billing/payment-intent-status. Expected { isActive: boolean }.",
          data
        );
        throw new Error(
          "Received invalid data while checking PayG payment status."
        );
      }

      console.log(`PayG payment status isActive: ${data.isActive}`);
      return data.isActive;
    } catch (error) {
      console.error("Error checking PayG payment status:", error);
      throw error;
    }
  };
  // --- END: New function ---

  // --- NEW: Function to fetch timezones ---
  const fetchTimezones = async () => {
    if (availableTimezones.length > 0) return; // Don't refetch if already loaded

    setTimezonesLoading(true);
    setTimezonesError(null);
    try {
      const response = await fetch(`${backendAPIUrl}/workspace/timezones`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to fetch timezones");
      }
      setAvailableTimezones(data);
    } catch (err) {
      console.error("Error fetching timezones from context:", err);
      setTimezonesError(err.message);
      setAvailableTimezones([]); // Clear timezones on error
    } finally {
      setTimezonesLoading(false);
    }
  };
  // --- END: New function ---

  // --- NEW: Pricing popup control functions ---
  const showPricingPopup = () => {
    setIsPricingPopupOpen(true);
  };

  const hidePricingPopup = () => {
    setIsPricingPopupOpen(false);
  };

  const checkAndShowPricingPopup = () => {
    // Check if user should see pricing popup (not logged in, no active subscription, etc.)
    const shouldShowPricing =
      !workspaceId ||
      (!subscriptionLoading &&
        (!subscriptionDetails?.isActive ||
          (!subscriptionDetails?.planType === "subscription" &&
            !subscriptionDetails?.planType === "pay_as_you_go")));

    if (shouldShowPricing) {
      showPricingPopup();
    }

    return shouldShowPricing;
  };
  // --- END: Pricing popup functions ---

  return (
    <WorkspaceContext.Provider
      value={{
        fetchWorkspaceInfo,
        updateWorkspaceInformation,
        workspaceInfo,
        setWorkspaceInfo,
        setWorkspaceId,
        isLoading: workspaceLoading,
        workspaceId,
        workspaceLoading,
        memberWorkspaces,
        handleWorkspaceChange,
        fetchWorkspaceUsers,
        inviteUserToWorkspace,
        editWorkspaceUser,
        deleteWorkspaceUser,
        createWorkspace,
        deleteWorkspace,
        resolveInviteToken,
        acceptWorkspaceInvite,
        // Add billing functions to the context
        createSetupIntent,
        getPaymentMethods,
        deletePaymentMethod,
        setDefaultPaymentMethod,
        getSubscription,
        prepareSubscriptionIntent,
        checkSubscriptionStatus,
        subscriptionDetails,
        subscriptionLoading,
        createCustomerPortalSession,
        fetchInvoices,
        // Add new functions
        createOneTimePaymentIntent,
        updateAutoRechargeSettings,
        checkPaygPaymentStatus, // Added new function
        // Add timezone related values
        availableTimezones,
        timezonesLoading,
        timezonesError,
        fetchTimezones,
        // Add pricing popup related values
        isPricingPopupOpen,
        showPricingPopup,
        hidePricingPopup,
        checkAndShowPricingPopup,
      }}
    >
      {children}
      <PricingPopup isOpen={isPricingPopupOpen} onClose={hidePricingPopup} />
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
