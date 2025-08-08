"use client";

import { useState } from "react";
import PricingCard from "@/app/(workspace)/[workspaceid]/settings/plans/PricingCard";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

const DevPlanItems = [
  "Access to fast models",
  "2,000 AI credits",
  "AI Workflow",
  "Unlimited Agents",
  "Unlimited links to train on",
  "API Access",
  "Integration",
  "Widget chat/voice",
  "Basic Analytics",
];

const SubscriptionItems = [
  "Access to fast models",
  "50,000 AI credits/mo",
  "AI Workflow",
  "Unlimited links to train on",
  "API Access",
  "Integration",
  "Widget chat/voice",
  "Basic Analytics",
];

const PricingPopup = ({ isOpen, onClose }) => {
  const router = useRouter();
  const {
    workspaceId,
    subscriptionDetails,
    subscriptionLoading,
    workspaceInfo,
  } = useWorkspace();

  // Extract Price IDs and Prices
  const priceIds = workspaceInfo?.priceIds || {};
  const yearlyPriceId = priceIds.businessPlanYearly;
  const monthlyPriceId = priceIds.businessPlanMonthly;
  // Prices are often stored in cents, convert if necessary for display
  // Assuming priceIds contains string representations like "1188" and "129"
  const yearlyDisplayPrice = priceIds.businessPlanYearlyPrice
    ? parseInt(priceIds.businessPlanYearlyPrice) / 100 // Example: Convert 1188 cents to 11.88 for yearly
    : null;
  const monthlyDisplayPrice = priceIds.businessPlanMonthlyPrice
    ? parseInt(priceIds.businessPlanMonthlyPrice) / 100 // Example: Convert 12900 cents to 129 for monthly
    : null;

  // Determine active subscription state only after loading is complete
  const isLoading = subscriptionLoading || !workspaceId;
  const isSubscribed =
    !isLoading &&
    subscriptionDetails?.isActive &&
    subscriptionDetails?.planType === "subscription";
  const isPayAsYouGoActive =
    !isLoading &&
    subscriptionDetails?.isActive && // Assuming isActive also applies to PAYG if it means billing is set up
    subscriptionDetails?.planType === "pay_as_you_go";
  const currentInterval = subscriptionDetails?.interval; // e.g., 'month' or 'year'

  // Define navigation handlers
  const goToBillingOverview = () => {
    router.push(`/${workspaceId}/settings/billing`);
    onClose();
  };

  const goToPaymentMethodsForSubscription = (plan, price, priceId) => {
    router.push(
      `/${workspaceId}/settings/billing?tab=payment-methods&subscribe=true&plan=${plan}&price=${price}&priceId=${priceId}`
    );
    onClose();
  };

  const subscriptionButtonText = isSubscribed
    ? "View Subscription Details"
    : "Select Plan"; // More generic now
  const subscriptionBottomText = isSubscribed
    ? "Your current active plan"
    : "Subscription payment";
  const subscriptionOnClick = isSubscribed
    ? goToBillingOverview
    : goToPaymentMethodsForSubscription; // Pass the function directly

  const payAsYouGoButtonText = isPayAsYouGoActive
    ? "View Billing Details"
    : "Select Pay as you go";
  const payAsYouGoOnClick = isPayAsYouGoActive
    ? goToBillingOverview // Navigate to billing overview if PAYG is active
    : () => {
        // Navigate to payment methods tab, indicating Pay-As-You-Go flow
        router.push(
          `/${workspaceId}/settings/billing?tab=payment-methods&flow=payg`
        );
        onClose();
      };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-8">
      <div
        className="bg-white rounded-[20px] w-fit relative"
        style={{ height: "fit-content" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-4 p-4">
            <h2
              className="text-2xl font-semibold leading-6 text-center"
              style={{
                color: "var(--card-foreground)",
                fontFamily: "var(--font-family-font-sans, Geist)",
                fontWeight: "var(--font-weight-font-semibold, 600)",
                letterSpacing: "-0.36px",
              }}
            >
              Upgrade your plan
            </h2>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div
              className="transform scale-80 origin-top"
              style={{ marginBottom: "-20%" }}
            >
              <div className="flex flex-col md:flex-row gap-1 p-1 bg-[#F4F4F5] w-fit rounded-[16px] mx-auto">
                <Skeleton className="h-fit min-h-[400px] w-fit md:max-w-[378px] rounded-[12px] md:rounded-l-[12px] md:rounded-r-none" />
                <Skeleton className="h-fit min-h-[400px] w-fit md:max-w-[378px] rounded-[12px] md:rounded-r-[12px] md:rounded-l-none" />
              </div>
            </div>
          ) : (
            <div
              className="transform scale-80 origin-top"
              style={{ marginBottom: "-20%" }}
            >
              <div className="flex flex-col md:flex-row gap-1 p-1 bg-[#F4F4F5] w-fit rounded-[16px] mx-auto">
                <PricingCard
                  headingText="Pay as you go"
                  subText="Developer Plan"
                  planItems={DevPlanItems}
                  buttonText={payAsYouGoButtonText}
                  bottomText={
                    isPayAsYouGoActive
                      ? "Your current active plan"
                      : "Pay as you go · Plus local taxes"
                  }
                  onClick={payAsYouGoOnClick}
                  isActivePlan={isPayAsYouGoActive} // Highlight if PAYG is active
                  isDisabled={isSubscribed} // Disable if a subscription is active
                  buttonAboveFeatures={true}
                />
                <PricingCard
                  headingText="Subscription"
                  type="subscription"
                  subText="Business Plan" // Corrected typo
                  showRecommended={!isSubscribed && !isPayAsYouGoActive} // Show if neither is active
                  planItems={SubscriptionItems}
                  buttonText={subscriptionButtonText}
                  bottomText={subscriptionBottomText}
                  onClick={subscriptionOnClick} // <-- Use dynamic handler
                  isActivePlan={isSubscribed} // <-- Highlight if subscribed
                  defaultInterval={
                    currentInterval === "year" ? "yearly" : "monthly"
                  } // <-- Set default tab
                  monthlyPrice={monthlyDisplayPrice}
                  yearlyPrice={yearlyDisplayPrice}
                  monthlyPriceId={monthlyPriceId}
                  yearlyPriceId={yearlyPriceId}
                  buttonAboveFeatures={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingPopup;
