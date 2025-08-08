"use client";
export const runtime = "edge";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UsageCard from "@/components/usage/UsageCard";
import { UsageChart } from "@/components/usage/UsageChart";
import { usePlayground } from "@/context/AgentContext";
import React, { useEffect, useState, use } from "react";
import { DateRangePicker } from "@/components/usage/DateRangePicker";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import returnAPIUrl from "@/config/config";
import { dateInYYYYMMDD } from "@/lib/utils";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const backendAPIUrl = returnAPIUrl();

// --- USAGE PAGE SKELETON ---
const UsagePageSkeleton = () => (
  <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-4 px-2 animate-pulse">
    <div className="flex justify-between w-full">
      <Skeleton className="h-8 w-32 rounded-md" />
    </div>
    <div className="flex justify-evenly gap-4 w-full max-md:flex-col">
      <Skeleton className="h-[160px] w-full md:flex-1 rounded-lg" />
      <Skeleton className="h-[160px] w-full md:flex-1 rounded-lg" />
      <Skeleton className="h-[160px] w-full md:flex-1 rounded-lg" />
    </div>
    <div className="w-full p-6 border rounded-lg bg-white shadow-md mt-4">
      <Skeleton className="h-6 w-1/4 mb-2 rounded-md" />
      <Skeleton className="h-4 w-1/2 mb-6 rounded-md" />
      <Skeleton className="h-[300px] w-full rounded-md" />
    </div>
  </div>
);
// --- END OF SKELETON ---

// --- DEDICATED TWILIO BALANCE DISPLAY COMPONENT ---
const TwilioBalanceDisplayCard = ({
  balanceData,
  twilioConfigError,
  isPageDoneLoading,
  workspaceId,
}) => {
  // Case 1: Parent page is still doing its initial load, and no specific Twilio config error yet.
  // The UsagePageSkeleton is shown by the parent. This card might show its own brief loading state
  // or rely on the parent skeleton covering its area.
  // For clarity here, if page isn't done loading, and it's not a twilioConfigError,
  // this component effectively waits or shows a minimal placeholder.
  // However, the primary display decision for this phase is managed by the parent's UsagePageSkeleton.

  // Case 2: Page has finished its initial load attempts.
  if (isPageDoneLoading) {
    if (twilioConfigError) {
      // This state is primarily handled by the parent component which shows a detailed error message and link.
      // This card could return null or a very minimal placeholder if the parent doesn't fully replace it.
      // For robustness, if somehow rendered directly, show a minimal error.
      return (
        <div className="p-6 border rounded-lg bg-gray-50 shadow-md text-center min-h-[160px] flex flex-col justify-center items-center w-full md:min-w-[400px]">
          <p className="text-sm mb-2">Twilio not yet set up</p>
          <div className="mt-2mb-2 w-full flex justify-center">
            {workspaceId && (
              <Link
                href={`/${workspaceId}/settings/connect`}
                className="text-sm leading-5 text-[#0F172A] font-sans underline"
              >
                Configure Twilio
              </Link>
            )}
          </div>
        </div>
      );
    }

    if (!balanceData) {
      // Page is done loading, no specific Twilio config error, but balanceData is still null/undefined.
      // This means the fetchBalance call failed for a generic reason or returned no data.
      return (
        <div className="p-6 border rounded-lg bg-white shadow-md flex flex-col justify-between items-center text-center min-h-[160px] w-full md:min-w-[400px]">
          <p className="text-gray-500 text-sm mt-auto">
            Twilio balance currently unavailable.
          </p>
          <div className="mt-auto mb-2 w-full flex justify-center">
            {workspaceId && (
              <Link
                href={`/${workspaceId}/settings/connect`}
                className="text-sm leading-5 text-[#0F172A] font-sans underline"
              >
                Configure Twilio
              </Link>
            )}
          </div>
        </div>
      );
    }

    // Case 3: Page is done loading, no errors, and balanceData IS available.
    const currentBalance = parseFloat(
      balanceData.balance?.current || 0
    ).toFixed(2);
    const balanceCurrency = balanceData.balance?.currency || "USD";
    const usageAmount = parseFloat(balanceData.usage?.amount || 0).toFixed(2);
    const usageCurrency = balanceData.usage?.currency || "USD";
    const usagePeriod = balanceData.usage?.period || "Last 30 days";

    return (
      <div className="p-6 border rounded-lg bg-white shadow-md flex flex-col gap-4 w-full md:min-w-[300px] text-sm">
        <h3 className="text-base font-semibold text-gray-700">
          Twilio Balance
        </h3>
        <div>
          <span className="font-medium text-gray-500">Current: </span>
          <span className="text-2xl font-bold text-gray-900">
            {currentBalance}
          </span>
          <span className="ml-1 text-sm text-gray-600">{balanceCurrency}</span>
        </div>
        {balanceData.usage && (
          <div className="mt-4">
            <span className="font-medium text-gray-500">
              Usage ({usagePeriod}):{" "}
            </span>
            <span className="font-semibold text-gray-700">{usageAmount}</span>
            <span className="ml-1 text-sm text-gray-600">{usageCurrency}</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback for when isPageDoneLoading is false (initial page skeleton is shown by parent).
  // This specific card can show its most basic loading state if needed, respecting your specific classes.
  return (
    <div className="p-6 border rounded-lg bg-white shadow-md text-center min-h-[160px] flex flex-col justify-center items-center w-full md:min-w-[400px]">
      <p className="text-gray-500 text-sm">Loading Twilio balance...</p>
    </div>
  );
};
// --- END OF TWILIO COMPONENT ---

const Page = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const workspaceId = params.workspaceid;
  const { getAllAgents } = usePlayground();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const { fetchWithAuth } = useAuthenticatedFetch();
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [twilioBalance, setTwilioBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usage, setUsage] = useState([]);
  const [date, setDate] = useState();
  const [twilioConfigError, setTwilioConfigError] = useState(false);
  const [totalAllocatedCredits, setTotalAllocatedCredits] = useState(0);
  useEffect(() => {
    setIsLoading(true);
    let active = true;

    const fetchAgents = async () => {
      try {
        const agentsData = await getAllAgents();
        if (active) setAgents(agentsData || []);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      }
    };

    const fetchUsage = async () => {
      try {
        const response = await fetchWithAuth(
          `${backendAPIUrl}/usage/agent-stats`,
          {
            credentials: "include",
          }
        );
        if (!response.ok) {
          console.error(
            "Failed fetch agent usage stats, status:",
            response.status
          );
          return;
        }
        const data = await response.json();
        if (active) {
          setUsage(data || []);
          let credits = 0;
          (data || []).forEach((item) => (credits += item.creditsUsed));
          setCreditsUsed(credits);
          setTotalAllocatedCredits(data.totalAllocatedCredits);
        }
      } catch (error) {
        console.error("Error fetching agent usage stats:", error);
      }
    };

    const fetchBalance = async () => {
      try {
        const response = await fetch(`${backendAPIUrl}/usage/twilio-balance`, {
          credentials: "include",
        });
        if (!response.ok) {
          try {
            const errorData = await response.json();
            if (errorData.errorCode === "MISSING_TWILIO_CREDENTIALS") {
              if (active) setTwilioConfigError(true);
              console.error("Twilio credentials missing:", errorData.error);
              return;
            }
          } catch (e) {
            console.error(
              "Error parsing error response or unknown error structure:",
              e
            );
          }

          return;
        }
        const data = await response.json();
        if (active) setTwilioBalance(data);
      } catch (error) {
        console.error("Error fetching Twilio balance:", error);
      }
    };

    Promise.allSettled([fetchUsage(), fetchAgents(), fetchBalance()]).finally(
      () => {
        if (active) setIsLoading(false);
      }
    );

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllAgents]);

  const fetchUsageDataByDateAndAgent = async (agent, dateRange) => {
    const response = await fetchWithAuth(
      `${backendAPIUrl}/usage/agent-stats?agentId=${
        agent || ""
      }&startDate=${dateInYYYYMMDD(dateRange?.from)}&endDate=${dateInYYYYMMDD(
        dateRange?.to
      )}`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    setUsage(data || []);
    let credits = 0;
    (data || []).forEach((item) => (credits += item.creditsUsed));
    setCreditsUsed(credits);
    setTotalAllocatedCredits(data.totalAllocatedCredits);
  };

  const handleAgentSelectChange = (value) => {
    setSelectedAgent(value);
    fetchUsageDataByDateAndAgent(value, date);
  };

  if (isLoading) {
    return <UsagePageSkeleton />;
  }

  return (
    <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-4 px-2">
      <div className="flex justify-between w-full max-sm:flex-col max-sm:gap-4">
        <h3 className="font-inter font-semibold text-2xl leading-6 tracking-tight">
          Usage
        </h3>
      </div>
      <div className="flex justify-evenly gap-4 w-full max-md:flex-col">
        <UsageCard
          x={creditsUsed}
          y={totalAllocatedCredits}
          workspaceId={workspaceId}
          title="Credits used"
          actionUrl="/settings/plans"
          actionTitle="Buy more credits"
        />
        <UsageCard
          x={agents.length || 0}
          y={10}
          title="Agent used"
          actionUrl={`/${workspaceId}/studio`}
          actionTitle="Create an agent"
          workspaceId={workspaceId}
        />

        <TwilioBalanceDisplayCard
          balanceData={twilioBalance}
          twilioConfigError={twilioConfigError}
          isPageDoneLoading={!isLoading}
          workspaceId={workspaceId}
        />
      </div>
      {usage.length > 0 ? (
        <UsageChart usage={usage} />
      ) : (
        !twilioConfigError && (
          <div className="w-full text-center py-10 text-gray-500">
            No agent usage data to display for the selected period.
          </div>
        )
      )}
    </div>
  );
};

export default Page;
