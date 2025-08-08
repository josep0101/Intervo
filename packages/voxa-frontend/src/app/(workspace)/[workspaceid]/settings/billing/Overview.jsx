"use client";

import { InfoIcon, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/settings/ButtonGroup";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn, formatCreditsAsUSD } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import { useState, useEffect } from "react";
import AutoRechargeDialog from "@/components/settings/AutoRechargeDialog";
import { useSearchParams, useRouter } from "next/navigation";

const formatDate = (isoString) => {
  if (!isoString) return "N/A";
  try {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid Date";
  }
};

const formatStripeAmount = (amount, currency) => {
  if (amount === undefined || amount === null || !currency) return "N/A";
  try {
    const amountInMajorUnit = amount / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountInMajorUnit);
  } catch (e) {
    console.error("Error formatting Stripe amount:", e);
    return "Invalid Price";
  }
};

const formatCredits = (balance) => {
  if (balance === undefined || balance === null) return "0 Credits";
  return `${balance.toLocaleString()} Credits`;
};

const formatCreditsAsUSDWithLabel = (balance) => {
  if (balance === undefined || balance === null) return "$0.00 USD";
  return `${formatCreditsAsUSD(balance)} USD`;
};

const Overview = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    subscriptionDetails,
    subscriptionLoading,
    workspaceInfo,
    workspaceLoading,
    createCustomerPortalSession,
  } = useWorkspace();

  useEffect(() => {
    const showDialog = searchParams.get("dialog") === "auto-recharge";
    setDialogOpen(showDialog);
  }, [searchParams]);

  const handleOpenChange = (isOpen) => {
    setDialogOpen(isOpen);
    if (!isOpen) {
      const params = new URLSearchParams(searchParams);
      params.delete("dialog");
      router.replace(`?${params.toString()}`);
    }
  };

  const handleManageBilling = async () => {
    try {
      await createCustomerPortalSession();
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      alert(`Error: ${error.message || "Could not open billing management."}`);
    }
  };

  const payAsYouGoButtons = [
    {
      label: "Add to credit balance",
      onClick: () => {
        if (workspaceInfo?._id) {
          router.push(
            `/${workspaceInfo._id}/settings/billing?tab=payment-methods&flow=payg`
          );
        } else {
          console.error(
            "Workspace ID not available for Pay As You Go navigation"
          );
        }
      },
    },
    {
      label: "Upgrade to Business Plan",
      onClick: () => {
        if (workspaceInfo?._id) {
          router.push(`/${workspaceInfo._id}/settings/plans`);
        } else {
          console.error(
            "Workspace ID not available for navigating to plans page"
          );
        }
      },
    },
  ];

  let subscriptionPlanButtons = [];
  if (subscriptionDetails?.isActive) {
    if (subscriptionDetails.interval === "month") {
      subscriptionPlanButtons.push({
        label: "Switch to Annual billing",
        onClick: handleManageBilling,
      });
    } else {
      subscriptionPlanButtons.push({
        label: "Update Plan",
        onClick: handleManageBilling,
      });
    }
    subscriptionPlanButtons.push({
      label: "Cancel Subscription",
      onClick: handleManageBilling,
    });
  }

  const isLoading = workspaceLoading || subscriptionLoading;
  const planType = isLoading ? null : subscriptionDetails?.planType;
  const hasActiveSubscription = isLoading
    ? false
    : subscriptionDetails?.isActive === true && planType === "subscription";
  const creditBalance = isLoading
    ? null
    : subscriptionDetails?.creditInfo?.totalRemainingCredits;
  const paygValue = isLoading ? null : subscriptionDetails?.paygUsageValue;
  const autoRechargeInfo = isLoading ? null : subscriptionDetails?.autoRecharge;

  let creditTooltipText = "Amount of credits available in your account.";
  if (!isLoading) {
    if (planType === "subscription") {
      creditTooltipText = "Credits included with your subscription plan.";
    } else if (planType === "pay_as_you_go") {
      creditTooltipText = "Credits purchased via auto-recharge or top-ups.";
    } else if (planType === "free_with_credits") {
      creditTooltipText =
        "Your credits may expire soon. Upgrade for more features and to keep your credits.";
    } else if (planType === "free") {
      creditTooltipText = "Credits granted to your free account.";
    }
  }

  const goToPlansPage = () => {
    console.log(workspaceInfo, "workspaceInfo");
    if (workspaceInfo?._id) {
      router.push(`/${workspaceInfo._id}/settings/plans`);
    }
  };

  return (
    <div className="flex flex-col font-sans">
      {isLoading && (
        <div className="flex flex-col mt-8 pb-3 gap-4">
          <Skeleton className="h-7 w-48" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-52" />
          </div>
          <Skeleton className="h-24 w-full max-w-[628px] mt-4" />
        </div>
      )}

      {!isLoading && (
        <>
          <div className="flex flex-col mt-8 pb-3 gap-4">
            {planType === "subscription" && subscriptionDetails && (
              <>
                <h4 className="text-xl leading-7 font-semibold">
                  {subscriptionDetails.planName || "Unknown Plan"}
                </h4>
                <h3 className="text-2xl leading-8 font-semibold flex items-center gap-1">
                  {formatStripeAmount(
                    subscriptionDetails.amount,
                    subscriptionDetails.currency
                  )}
                  {subscriptionDetails.interval && (
                    <span className="text-base leading-6 font-medium text-primary font-sans">
                      /{subscriptionDetails.interval}
                    </span>
                  )}
                </h3>
              </>
            )}
            {planType === "pay_as_you_go" && (
              <h4 className="text-xl leading-7 font-semibold">Pay As You Go</h4>
            )}
            {(planType === "free" || planType === "free_with_credits") && (
              <h4 className="text-xl leading-7 font-semibold">Free Plan</h4>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground gap-2 leading-5 flex items-center">
                Credit Balance
                <Tooltip delayDuration={200}>
                  <TooltipTrigger>
                    <InfoIcon className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{creditTooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              </span>
              <h3 className="text-2xl leading-8 font-semibold flex items-center gap-1">
                {formatCredits(creditBalance)}
                {planType === "pay_as_you_go" && paygValue && (
                  <span className="text-base leading-6 font-normal text-muted-foreground">
                    ({formatStripeAmount(paygValue.value, paygValue.currency)}{" "}
                    used)
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex flex-col py-3 gap-3">
            <div className="flex bg-white border max-w-[628px] items-center justify-between border-border rounded-md py-6 pl-6 px-8 gap-4">
              {planType === "subscription" && (
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm leading-5 font-semibold">
                    Subscription Active
                  </h4>
                  {subscriptionDetails?.nextBillingDate && (
                    <p className="text-sm leading-5 text-foreground">
                      Next charge on{" "}
                      <span className="font-medium">
                        {formatDate(subscriptionDetails.nextBillingDate)}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {planType === "pay_as_you_go" && autoRechargeInfo && (
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm leading-5 font-semibold">
                    {autoRechargeInfo?.autoRechargeEnabled
                      ? "Auto recharge is on"
                      : "Auto recharge is off"}
                  </h4>
                  {autoRechargeInfo?.autoRechargeEnabled && (
                    <p className="text-sm leading-5 text-foreground">
                      When balance reaches{" "}
                      {formatCreditsAsUSDWithLabel(
                        autoRechargeInfo.autoRechargeThresholdCredits
                      )}
                      , we&apos;ll add{" "}
                      {formatCreditsAsUSDWithLabel(
                        autoRechargeInfo.autoRechargeAmountToAddCredits
                      )}
                      .
                    </p>
                  )}
                  {!autoRechargeInfo?.autoRechargeEnabled && (
                    <p className="text-sm leading-5 text-foreground">
                      Enable auto recharge to automatically top up your credits
                      when they run low.
                    </p>
                  )}
                </div>
              )}
              {(planType === "free" || planType === "free_with_credits") && (
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm leading-5 font-semibold">Free Plan</h4>
                  <p className="text-sm leading-5 text-foreground">
                    Upgrade to a paid plan to unlock more features and credits.
                  </p>
                </div>
              )}

              {planType === "subscription" && (
                <Badge variant="success">Active</Badge>
              )}
              {planType === "pay_as_you_go" && (
                <Button
                  className="h-10"
                  onClick={() => router.push("?dialog=auto-recharge")}
                >
                  Modify
                </Button>
              )}
              {(planType === "free" || planType === "free_with_credits") && (
                <Button
                  className="h-10"
                  variant="outline"
                  onClick={goToPlansPage}
                >
                  Upgrade Plan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            {(planType === "subscription" || planType === "pay_as_you_go") && (
              <ButtonGroup
                buttons={
                  hasActiveSubscription
                    ? subscriptionPlanButtons
                    : payAsYouGoButtons
                }
              />
            )}
          </div>
        </>
      )}

      <AutoRechargeDialog open={dialogOpen} onOpenChange={handleOpenChange} />

      {isLoading ? (
        <Skeleton className="h-[130px] w-full max-w-[420px] mt-4 rounded-md" />
      ) : (
        <div className="flex flex-col bg-white border max-w-[420px] border-border rounded-md p-4 gap-1.5">
          <h4 className="text-sm leading-5 font-semibold">
            Custom Enterprise Voice Solutions
          </h4>
          <p className="text-sm leading-5 text-muted-foreground">
            Tailored infrastructure and support for high-volume, complex call
            handling requirements. Includes advanced security, custom
            integrations, dedicated support, and Service Level Agreements
            (SLAs).
          </p>
          <a
            href="mailto:support@voxa.ai?subject=Inquiry%3A%20Enterprise%20Plan%20for%20Voxa"
            className={cn(buttonVariants({ variant: "default" }), "h-10 mt-2")}
          >
            Request Enterprise Plan
          </a>
        </div>
      )}
    </div>
  );
};

export default Overview;
