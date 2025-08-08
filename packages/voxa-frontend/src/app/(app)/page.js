// src/app/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import OnboardingDialog from "@/components/onboarding/OnboardingDialog";
import { Loader2 } from "lucide-react";

export const runtime = "edge";

export default function Home() {
  const {
    isAuthenticated,
    isFirstLogin,
    userProfile,
    profileLoading,
    updateUserProfile,
  } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  console.log("userProfile", userProfile);
  const { workspaceId, workspaceLoading, fetchWorkspaceInfo } = useWorkspace();
  const router = useRouter();

  console.log("isAuthenticated", isAuthenticated);

  useEffect(() => {
    // Skip redirect if we're on the verify page
    if (window.location.pathname.includes("/verify")) {
      return;
    }

    // Load workspace data when authenticated
    if (isAuthenticated === true && !workspaceId && !workspaceLoading) {
      fetchWorkspaceInfo();
      return;
    }

    if (isAuthenticated === true) {
      // Only proceed after profile is loaded
      if (profileLoading) {
        return;
      }

      // Check if onboarding is needed for the user
      if (isFirstLogin) {
        setShowOnboarding(true);
        return;
      }

      if (workspaceLoading || !workspaceId) {
        return; // Wait until workspace data is loaded
      }
      router.push(`/${workspaceId}/studio`);
    } else if (isAuthenticated === "pending") {
      return;
    } else {
      router.push("/login");
    }
  }, [
    isAuthenticated,
    isFirstLogin,
    profileLoading,
    workspaceId,
    workspaceLoading,
    router,
    fetchWorkspaceInfo,
  ]);

  const handleOnboardingComplete = async (onboardingData) => {
    try {
      // Update user profile with onboarding data
      await updateUserProfile(onboardingData);

      // Close the dialog
      setShowOnboarding(false);

      // Continue to the workspace
      if (workspaceId) {
        router.push(`/${workspaceId}/studio`);
      }
    } catch (error) {
      console.error("Onboarding error:", error);
    }

    return Promise.resolve();
  };

  // Show loader while loading
  if (isAuthenticated === true && (profileLoading || workspaceLoading)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}
