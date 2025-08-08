"use client";
import React from "react";
import { NavbarMenuItem, Link, Divider } from "@nextui-org/react";
import {
  BookOpen,
  Building2Icon,
  ChartSpline,
  ChevronDownIcon, // For Switch Workspace visual cue
  Contact,
  CreditCard,
  HelpCircle,
  LogOut,
  Phone,
  Plus,
  SettingsIcon,
  User, // Could be used for a profile link if desired
  UsersIcon,
  Check, // Added Check icon
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreateWorkspaceDialog from "./CreateWorkspaceDialog"; // Assuming path is correct from Dropdown.jsx

export function MobileNavContent({
  mainNavItems = [],
  workspaceId,
  workspaceInfo,
  memberWorkspaces = [],
  handleWorkspaceChange,
  logout,
  user,
  isAuthenticated,
  processedCredits,
  workspaceLoading,
  // setIsMenuOpen, // Prop to close menu, NextUI might handle this via Link clicks
}) {
  if (!isAuthenticated) {
    return (
      <>
        <NavbarMenuItem key="mobile-help-unauthenticated">
          <Link
            href="https://docs.voxa.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 h-9 w-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
          >
            <HelpCircle className="h-5 w-5" />
            Help
          </Link>
        </NavbarMenuItem>
        <NavbarMenuItem key="mobile-login">
          <Link
            href="/login"
            className="h-9 w-max items-center justify-center px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
          >
            Login
          </Link>
        </NavbarMenuItem>
      </>
    );
  }

  // Helper to render menu items consistently
  const renderLinkItem = (href, text, icon, keySuffix = text) => (
    <NavbarMenuItem
      key={`mobile-${keySuffix.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Link
        href={href}
        className="flex items-center gap-3 h-9 w-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
      >
        {icon && React.cloneElement(icon, { className: "h-5 w-5" })}
        {text}
      </Link>
    </NavbarMenuItem>
  );

  return (
    <>
      {/* Main Nav Items */}
      {mainNavItems.map((item) =>
        renderLinkItem(
          `/${workspaceId}${item.href}`,
          item.title,
          item.icon,
          item.title
        )
      )}

      <div className="px-4">
        <Divider className="my-2 h-px bg-neutral-200" />
      </div>

      {/* Credit/Plan Info & Upgrade - similar to SiteHeader's mobile menu logic */}
      {processedCredits?.planInfo &&
        renderLinkItem(
          `/${workspaceId}/settings/billing`,
          `Credits: ${processedCredits.planInfo.remaining} ${processedCredits.planInfo.suffix}`,
          <CreditCard />,
          "plan-credits"
        )}
      {!processedCredits?.planInfo &&
        processedCredits?.oneTimeInfo &&
        renderLinkItem(
          `/${workspaceId}/settings/plans`,
          processedCredits.oneTimeInfo.text,
          <CreditCard />,
          "onetime-credits"
        )}
      {!processedCredits?.planInfo &&
        !processedCredits?.oneTimeInfo &&
        !workspaceLoading &&
        workspaceId &&
        renderLinkItem(
          `/${workspaceId}/settings/plans`,
          "Upgrade Account",
          <CreditCard />,
          "upgrade-account"
        )}
      {(processedCredits?.planInfo ||
        processedCredits?.oneTimeInfo ||
        (!workspaceLoading && workspaceId)) && (
        <div className="px-4">
          <Divider className="my-2 h-px bg-neutral-200" />
        </div>
      )}

      {/* Workspace Actions */}
      <NavbarMenuItem key="mobile-new-workspace">
        <Dialog>
          <DialogTrigger className="flex items-center gap-3 h-9 w-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none">
            <Plus className="h-5 w-5" />
            New Workspace
          </DialogTrigger>
          <CreateWorkspaceDialog />
        </Dialog>
      </NavbarMenuItem>

      {/* Refactored Switch Workspace Section for MobileNavContent */}
      {memberWorkspaces && memberWorkspaces.length > 1 && (
        <>
          {/* "Switch Workspace" Sub-heading */}
          <NavbarMenuItem
            key="mobile-switch-workspace-header"
            className="px-4 pt-2 pb-1" // Adjusted padding
          >
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <Building2Icon className="h-5 w-5" />
              Switch Workspace
            </div>
          </NavbarMenuItem>

          {/* List of Workspaces */}
          {memberWorkspaces.map((workspace) => (
            <NavbarMenuItem
              key={workspace._id}
              onClick={() => {
                handleWorkspaceChange(workspace._id);
                // Potentially close the menu here if setIsMenuOpen is passed and used
              }}
              className="p-0" // Changed py-0 to p-0
            >
              {/* Using a Link-like structure for consistent styling and full-width click */}
              <button // Using button for onClick, styled like a link item
                className="flex items-center gap-3 h-9 w-full pl-[48px] pr-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              >
                {/* Icon space could be preserved with a conditional icon or fixed-width spacer */}
                <span className="pl-4">{workspace.name}</span>
                {workspace._id === workspaceId && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            </NavbarMenuItem>
          ))}
        </>
      )}
      {/* End of Refactored Switch Workspace Section */}

      {memberWorkspaces && memberWorkspaces.length > 1 && (
        <div className="px-4">
          <Divider className="my-1 h-px bg-neutral-200" />
        </div>
      )}

      {/* Navigation Links from Dropdown */}
      {renderLinkItem(`/${workspaceId}/studio`, "Agents", <Contact />)}
      {renderLinkItem(
        `/${workspaceId}/studio?page=knowledgebase`,
        "Knowledge Base",
        <BookOpen />
      )}
      {renderLinkItem(
        `/${workspaceId}/phonenumber`,
        "Phone Numbers",
        <Phone />
      )}

      <div className="px-4">
        <Divider className="my-2 h-px bg-neutral-200" />
      </div>

      {/* Conditional Admin/Owner links */}
      {workspaceInfo?.user === user?.id && (
        <>
          {renderLinkItem(
            `/${workspaceId}/settings/users`,
            "Users",
            <UsersIcon />
          )}
          {renderLinkItem(
            `/${workspaceId}/settings/users`,
            "Invite Users",
            <Plus />
          )}{" "}
          {/* Consider a different icon or if this is redundant with Users page */}
          {renderLinkItem(`/${workspaceId}/usage`, "Usage", <ChartSpline />)}
          {renderLinkItem(
            `/${workspaceId}/settings/billing`,
            "Billing",
            <CreditCard />
          )}
          {renderLinkItem(
            `/${workspaceId}/settings`,
            "Settings",
            <SettingsIcon />
          )}
          <div className="px-4">
            <Divider className="my-2 h-px bg-neutral-200" />
          </div>
        </>
      )}

      {/* Help Link */}
      {renderLinkItem(
        "https://docs.voxa.ai",
        "Help",
        <HelpCircle />,
        "help"
      )}

      <div className="px-4">
        <Divider className="my-2 h-px bg-neutral-200" />
      </div>

      {/* Logout */}
      <NavbarMenuItem key="mobile-logout">
        <button
          onClick={logout}
          className="flex items-center gap-3 h-9 w-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </NavbarMenuItem>
    </>
  );
}
