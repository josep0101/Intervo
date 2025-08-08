"use client";
import React from "react";
import {
  Navbar,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  Link,
  NavbarMenuItem,
  NavbarMenu,
  Chip,
} from "@nextui-org/react";
import { useAuth } from "@/context/AuthContext";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { AgentNavItems } from "@/config/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlayground } from "@/context/AgentContext";
import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import Dropdown from "./Dropdown";
import { MobileNavContent } from "./MobileNavContent";

export function SiteHeader({ slug }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const { getAllAgents } = usePlayground();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(slug || "");
  const {
    workspaceId,
    handleWorkspaceChange,
    memberWorkspaces,
    workspaceInfo,
    workspaceLoading,
  } = useWorkspace();
  const pathname = usePathname();

  useEffect(() => {
    const fetchAgents = async () => {
      const agents = await getAllAgents();
      setAgents(agents);
    };

    fetchAgents();
  }, []);

  const handleAgentSelectChange = (value) => {
    setSelectedAgent(value);
    router.push(`/${workspaceId}/agent/${value}/playground`);
  };

  // Helper function to calculate days remaining
  const calculateDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    // Ensure expiry date is treated as end of day for comparison
    const expiry = new Date(expiryDate);
    expiry.setHours(23, 59, 59, 999);

    // Ensure today is treated as start of day
    today.setHours(0, 0, 0, 0);

    const diffTime = expiry - today;
    if (diffTime < 0) return 0; // Already expired

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Process credits using useMemo
  const processedCredits = useMemo(() => {
    if (workspaceLoading || !workspaceInfo?._id || !workspaceInfo?.creditInfo) {
      return { oneTimeInfo: null, planInfo: null };
    }
    console.log(workspaceInfo, "workspaceinfo");

    const creditInfo = workspaceInfo.creditInfo;
    let oneTimeInfo = null;
    let planInfo = null;

    // Determine if current plan is pay-as-you-go
    const isPayAsYouGoPlan = workspaceInfo.billingCycleInterval === "payg";

    // Process One-Time Credits
    if (
      creditInfo.oneTimeCredits &&
      creditInfo.oneTimeCredits.remainingCredits > 0
    ) {
      const validCredits = (creditInfo.oneTimeCredits.credits || []).filter(
        (credit) =>
          !credit.expiresAt || new Date(credit.expiresAt) >= new Date()
      );

      if (validCredits.length > 0) {
        const totalRemaining = creditInfo.totalRemainingCredits;

        if (isPayAsYouGoPlan) {
          // If Pay As You Go, always show without expiry, add asterisk
          oneTimeInfo = {
            text: `${totalRemaining} credits* available`,
          };
        } else {
          // Original logic for non-Pay As You Go plans (with expiry dates)
          const creditsWithExpiry = validCredits.filter(
            (credit) => credit.expiresAt
          );

          if (creditsWithExpiry.length > 0) {
            const soonestExpiry = creditsWithExpiry.reduce(
              (soonest, credit) => {
                const expiry = new Date(credit.expiresAt);
                return !soonest || expiry < soonest ? expiry : soonest;
              },
              null
            );

            const daysRemaining = calculateDaysRemaining(soonestExpiry);

            // Only show if not expired (daysRemaining > 0 or it expires today/future)
            if (daysRemaining !== null && daysRemaining >= 0) {
              const totalRemaining = creditInfo.totalRemainingCredits;
              const suffix =
                creditsWithExpiry.length > 1
                  ? ` (+${creditsWithExpiry.length - 1} more)`
                  : "";
              const daysText = daysRemaining === 1 ? "day" : "days";
              const expiryText =
                daysRemaining === 0
                  ? "expire today"
                  : `expire in ${daysRemaining} ${daysText}`;

              oneTimeInfo = {
                text: `${totalRemaining} credits ${expiryText}${suffix}`,
              };
            }
          } else {
            // No expiry dates - credits don't expire
            const totalRemaining = creditInfo.totalRemainingCredits;
            oneTimeInfo = {
              text: `${totalRemaining} credits available`,
            };
          }
        }
      }
    }

    // Process Plan Credits
    if (creditInfo.billingConfigured && creditInfo.billingPlan) {
      const { billingPlan } = creditInfo;
      const intervalAbbr =
        billingPlan.billingInterval === "monthly"
          ? "mo"
          : billingPlan.billingInterval === "yearly"
          ? "yr"
          : "";

      if (typeof billingPlan.remainingCredits === "number") {
        planInfo = {
          text: `AI Credit: `,
          remaining: creditInfo.totalRemainingCredits,
          suffix: ` Remaining/${intervalAbbr}`,
        };
      }
    }

    return { oneTimeInfo, planInfo };
  }, [workspaceInfo, workspaceLoading]);

  return (
    <header className="top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center">
        <Navbar
          className="!relative border-b items-center h-12"
          onMenuOpenChange={setIsMenuOpen}
          isMenuOpen={isMenuOpen}
          maxWidth={"full"}
        >
          <NavbarContent justify="start" className="gap-0">
            <div className="flex">
              <Link href="/" className="mr-6 flex items-center space-x-2">
                <span className="font-bold">Voxa.ai</span>
              </Link>
            </div>

            <Select
              value={selectedAgent}
              onValueChange={handleAgentSelectChange}
            >
              <SelectTrigger className="max-w-[136px] mr-2 w-full text-foreground">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {agents.map((item, index) => (
                    <SelectItem key={index} value={item._id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="hidden md:flex">
              {isAuthenticated &&
                AgentNavItems.map((item) => {
                  const isActive = pathname.startsWith(
                    `/${workspaceId}/agent/${slug}${item.href}`
                  );
                  return (
                    <NavbarItem key={item.href}>
                      <Link
                        href={`/${workspaceId}/agent/${slug}${item.href}`}
                        className={`${navigationMenuTriggerStyle()} ${
                          isActive
                            ? "relative after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-primary"
                            : ""
                        }`}
                      >
                        {item.title}
                      </Link>
                    </NavbarItem>
                  );
                })}
            </div>
          </NavbarContent>

          <NavbarMenu className="bg-white py-2 top-12">
            <MobileNavContent
              mainNavItems={AgentNavItems.map((item) => ({
                ...item,
                href: `/agent/${slug}${item.href}`,
              }))}
              workspaceId={workspaceId}
              workspaceInfo={workspaceInfo}
              memberWorkspaces={memberWorkspaces}
              handleWorkspaceChange={handleWorkspaceChange}
              logout={logout}
              user={user}
              isAuthenticated={isAuthenticated}
              processedCredits={processedCredits}
              workspaceLoading={workspaceLoading}
            />
          </NavbarMenu>

          <NavbarContent justify="end" className="gap-4">
            {isAuthenticated ? (
              <>
                {/* Show either plan credits, one-time credits, or upgrade */}
                {processedCredits.planInfo ? (
                  <NavbarItem className="hidden md:flex">
                    <Link href={`/${workspaceId}/settings/billing`}>
                      <Chip
                        variant="bordered"
                        className="bg-white border-gray-300 font-medium text-sm leading-none"
                      >
                        <span className="text-muted-foreground">
                          {processedCredits.planInfo.text}
                        </span>
                        <span className="text-muted-foreground font-medium">
                          {processedCredits.planInfo.remaining}
                        </span>
                        <span className="text-foreground">
                          {processedCredits.planInfo.suffix}
                        </span>
                      </Chip>
                    </Link>
                  </NavbarItem>
                ) : processedCredits.oneTimeInfo ? (
                  <NavbarItem className="hidden md:flex">
                    <Link href={`/${workspaceId}/settings/plans`}>
                      <Chip
                        variant="flat"
                        className="bg-slate-100 text-foreground font-medium text-sm leading-none"
                      >
                        {processedCredits.oneTimeInfo.text}
                      </Chip>
                    </Link>
                  </NavbarItem>
                ) : (
                  !workspaceLoading &&
                  workspaceId && (
                    <NavbarItem className="hidden md:flex">
                      <Link href={`/${workspaceId}/settings/plans`}>
                        <Chip
                          variant="flat"
                          className="bg-slate-100 text-foreground font-medium text-sm leading-none cursor-pointer"
                          size="sm"
                        >
                          Upgrade Account
                        </Chip>
                      </Link>
                    </NavbarItem>
                  )
                )}

                <NavbarItem className="hidden md:flex">
                  <Link
                    href="https://docs.voxa.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm"
                  >
                    Help
                  </Link>
                </NavbarItem>

                <NavbarItem className="hidden md:flex">
                  <Dropdown />
                </NavbarItem>
              </>
            ) : (
              <>
                <NavbarItem className="hidden md:flex">
                  <Link
                    href="https://docs.voxa.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm"
                  >
                    Help
                  </Link>
                </NavbarItem>
                <NavbarItem className="hidden lg:flex">
                  <Link href="/login">Login</Link>
                </NavbarItem>
              </>
            )}
            <button
              type="button"
              className="md:hidden flex items-center justify-center w-6 h-full text-foreground focus:outline-none"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              )}
            </button>
          </NavbarContent>
        </Navbar>
      </div>
    </header>
  );
}
