"use client";
import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import returnAPIUrl from "@/config/config";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/context/WorkspaceContext";

const ICON_URL =
  "https://assets-v2.codedesign.ai/storage/v1/object/public/voxa-assets//voxa-icon-Photoroom.png";

// Loading fallback component
const AcceptInviteLoading = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
    <div className="flex items-center mb-8">
      <img
        src={ICON_URL}
        alt="Voxa.ai Logo"
        width={32}
        height={32}
        className="mr-2"
      />
      <h4 className="font-medium text-xl text-primary leading-7">Voxa.ai</h4>
    </div>
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <h2 className="text-2xl font-semibold">Loading Invitation...</h2>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Main content component
const AcceptInviteContent = () => {
  const [status, setStatus] = useState("loading"); // loading, resolving, idle, accepting, success, error
  const [message, setMessage] = useState("Checking invitation details...");
  const [workspaceId, setWorkspaceId] = useState(null); // Store workspaceId from token
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { acceptWorkspaceInvite, resolveInviteToken } = useWorkspace();
  const { toast } = useToast();
  const token = searchParams.get("token");

  useEffect(() => {
    if (isLoading) {
      setStatus("loading");
      setMessage("Checking authentication...");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link. No token provided.");
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login, preserving the invite link
      const redirectUrl = `/accept-invite?token=${token}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      setStatus("loading");
      setMessage("Redirecting to login...");
      return;
    }

    // If authenticated and token exists, resolve token using context function
    const handleResolveToken = async () => {
      // Prevent re-resolving if acceptance is in progress, succeeded, or already failed
      if (status !== "loading" && status !== "resolving") {
        console.log(`Skipping token resolution because status is: ${status}`);
        return;
      }

      setStatus("resolving");
      setMessage("Verifying invitation details...");
      try {
        // Call the context function to resolve the token
        const resolvedWorkspaceId = await resolveInviteToken(token);

        // Check if a valid workspaceId was returned (context function should handle errors)
        if (!resolvedWorkspaceId) {
          throw new Error("Could not resolve invitation details."); // Or context fn throws
        }

        setWorkspaceId(resolvedWorkspaceId);
        setStatus("idle");
        setMessage(
          "You've been invited to join a workspace on Voxa.ai. Click below to accept."
        );
      } catch (error) {
        console.error("Resolve token error:", error);
        const errorMessage =
          error.message ||
          "Failed to verify invitation. The link might be invalid or expired.";
        setStatus("error");
        setMessage(errorMessage);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
      }
    };

    // Only call handleResolveToken if prerequisites are met
    if (isAuthenticated && token) {
      handleResolveToken();
    }
  }, [isAuthenticated, isLoading, token, router, resolveInviteToken, toast]);

  const handleAcceptInvite = useCallback(async () => {
    // Ensure we have workspaceId, token, and context function
    if (
      !workspaceId ||
      !token ||
      !acceptWorkspaceInvite ||
      status === "accepting"
    )
      return;

    setStatus("accepting");
    setMessage("Accepting the invitation...");

    try {
      // Pass both workspaceId and token to the context function
      await acceptWorkspaceInvite(workspaceId, token);

      setStatus("success");
      setMessage("Invitation accepted successfully! Redirecting...");
      toast({
        title: "Success",
        description: "Invitation accepted! You have joined the workspace.",
      });

      // Redirect to root after a delay
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Accept invite error:", error);
      const errorMessage =
        error?.message ||
        "Failed to accept the invitation. It might be invalid, expired, or already accepted.";
      setStatus("error");
      setMessage(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
    // Add token to dependency array for useCallback
  }, [workspaceId, token, acceptWorkspaceInvite, status, toast, router]);

  let statusIcon;
  let statusTitle;

  switch (status) {
    case "success":
      statusIcon = <CheckCircle2 className="h-16 w-16 text-green-600" />;
      statusTitle = "Invitation Accepted!";
      break;
    case "error":
      statusIcon = <XCircle className="h-16 w-16 text-red-600" />;
      statusTitle = "Invitation Failed";
      break;
    case "accepting":
      statusIcon = <Loader2 className="h-16 w-16 animate-spin text-primary" />;
      statusTitle = "Accepting Invitation";
      break;
    case "resolving":
      statusIcon = <Loader2 className="h-16 w-16 animate-spin text-primary" />;
      statusTitle = "Verifying Invitation";
      break;
    case "loading":
      statusIcon = <Loader2 className="h-16 w-16 animate-spin text-primary" />;
      statusTitle = "Loading...";
      break;
    default: // idle
      statusIcon = <UserPlus className="h-16 w-16 text-primary" />;
      statusTitle = "Accept Invitation";
  }

  // Show loading component during auth check or redirect determination
  if ((status === "loading" && !isLoading) || status === "resolving") {
    return <AcceptInviteLoading />; // Show loader until redirect or resolution completes
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
      <div className="flex items-center mb-8">
        <img
          src={ICON_URL}
          alt="Voxa.ai Logo"
          width={32}
          height={32}
          className="mr-2"
        />
        <h4 className="font-medium text-xl text-primary leading-7">
          Voxa.ai
        </h4>
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            {statusIcon}
            <h2 className="text-2xl font-semibold">{statusTitle}</h2>
            <p className="text-muted-foreground">{message}</p>
          </div>
        </CardContent>
        {(status === "idle" || status === "error") && (
          <CardFooter className="flex flex-col gap-4">
            {status === "idle" && workspaceId && (
              <Button
                onClick={handleAcceptInvite}
                disabled={status === "accepting"}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Accept Invitation
              </Button>
            )}
            {status === "error" && (
              <Button onClick={() => router.push("/")} className="w-full">
                Go to Dashboard
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

// Main page component wrapping with Suspense
const AcceptInvitePage = () => {
  return (
    <Suspense fallback={<AcceptInviteLoading />}>
      <AcceptInviteContent />
    </Suspense>
  );
};

export default AcceptInvitePage;
