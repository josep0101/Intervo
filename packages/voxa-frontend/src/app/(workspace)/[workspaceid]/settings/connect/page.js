"use client";
export const runtime = "edge";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Title } from "@/components/ui/title";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Edit3, Trash2, XCircle, Loader2 } from "lucide-react";
import returnAPIUrl from "@/config/config";

const Page = () => {
  const { toast } = useToast();
  const {
    updateWorkspaceInformation,
    workspaceInfo,
    setWorkspaceInfo,
    fetchWorkspaceInfo,
  } = useWorkspace();

  const [settings, setSettings] = useState(workspaceInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const info = await fetchWorkspaceInfo();
      setSettings(info || {});
      if (info && info.twilioSID && info.apiKey) {
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateWorkspace = async () => {
    if (!settings.twilioSID || !settings.apiKey) {
      toast({
        title: "Missing Credentials",
        description: "Please provide both Twilio SID and API Key/Auth Token.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    const backendAPIUrl = returnAPIUrl();
    try {
      const response = await fetch(
        `${backendAPIUrl}/workspace/validate-twilio-credentials`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providedSid: settings.twilioSID,
            providedToken: settings.apiKey,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.isValid) {
        if (data.savedToWorkspace) {
          toast({
            title: data.message || "Twilio connected successfully!",
            variant: "success",
          });
          const updatedInfo = await fetchWorkspaceInfo();
          setSettings(updatedInfo || {});
          setWorkspaceInfo(updatedInfo || {});
          setIsEditing(false);
        } else {
          toast({
            title: data.message || "Credentials valid, but not saved.",
            description:
              data.details || "Please ensure your workspace is active.",
            variant: "warning",
          });
        }
      } else {
        toast({
          title: data.message || "Validation Failed",
          description:
            data.details ||
            (data.errorCode
              ? `Error: ${data.errorCode}`
              : "Could not connect to Twilio with the provided credentials."),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating Twilio credentials:", error);
      toast({
        title: "Client-side Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleDeleteCredentials = async () => {
    setIsSubmitting(true);
    const clearedSettingsPayload = {
      twilioSID: "",
      apiKey: "",
      forceClearTwilioCredentials: true,
    };

    const res = await updateWorkspaceInformation(clearedSettingsPayload);

    if (res.message || (!res.error && res.status >= 200 && res.status < 300)) {
      toast({
        title: res.message || "Twilio credentials removed successfully.",
        variant: "success",
      });
      const updatedInfo = await fetchWorkspaceInfo();
      setSettings(updatedInfo || { twilioSID: "", apiKey: "" });
      setWorkspaceInfo(updatedInfo || { twilioSID: "", apiKey: "" });
      setIsEditing(true);
    } else {
      toast({
        title:
          res.error?.message || res.error || "Failed to remove credentials.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const isTwilioConnected = !!(
    settings &&
    settings.twilioSID &&
    settings.apiKey
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />{" "}
        <span className="ml-2">Loading settings...</span>
      </div>
    );

  return (
    <div className="flex flex-col items-start w-full max-w-2xl mx-auto p-4 md:p-6">
      <Title subTitle={true}>Connect Twilio Account</Title>

      {isTwilioConnected && !isEditing ? (
        <div className="mt-8 w-full space-y-6">
          <Alert
            variant="default"
            className="bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
          >
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-700 dark:text-green-300 font-semibold">
              Twilio Connected
            </AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-500">
              Your Twilio account is successfully connected.
            </AlertDescription>
          </Alert>
          <div className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Twilio SID
              </p>
              <p className="text-sm text-foreground break-all">
                {settings.twilioSID}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Twilio API Key / Auth Token
              </p>
              <p className="text-sm text-foreground break-all">************</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <Edit3 className="h-4 w-4" />{" "}
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Edit Credentials"
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCredentials}
              className="flex items-center gap-2 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />{" "}
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove Credentials"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-8 flex-col w-full mt-8">
          <div className="space-y-2">
            <label
              htmlFor="twilioSID"
              className="text-sm font-medium leading-5 text-foreground font-sans"
            >
              Twilio Account SID
            </label>
            <Input
              id="twilioSID"
              placeholder="ACxxxxxxxxxxxxxx"
              value={settings?.twilioSID || ""}
              onChange={(e) =>
                setSettings({ ...settings, twilioSID: e.target.value })
              }
              className="w-full"
              disabled={isSubmitting}
            />
            {(isEditing || !isTwilioConnected) && (
              <p className="text-muted-foreground font-sans text-sm leading-5">
                Find your Account SID in your Twilio console.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="apiKey"
              className="text-sm font-medium leading-5 text-foreground font-sans"
            >
              Twilio Auth Token
            </label>
            <Input
              id="apiKey"
              placeholder="Enter your Twilio Auth Token"
              type="password"
              value={settings?.apiKey || ""}
              onChange={(e) =>
                setSettings({ ...settings, apiKey: e.target.value })
              }
              className="w-full"
              disabled={isSubmitting}
            />
            {(isEditing || !isTwilioConnected) && (
              <p className="text-muted-foreground font-sans text-sm leading-5">
                Find your Auth Token in your Twilio console.
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              className="flex text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-primary dark:hover:bg-primary/90 items-center justify-center min-h-10 font-inter font-medium text-sm px-6 py-2 w-full sm:w-auto"
              onClick={handleUpdateWorkspace}
              disabled={
                isSubmitting || !settings?.twilioSID || !settings?.apiKey
              }
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : null}
              {isSubmitting
                ? isTwilioConnected && isEditing
                  ? "Updating..."
                  : "Authenticating..."
                : isTwilioConnected && isEditing
                ? "Update Credentials"
                : "Save & Authenticate Twilio"}
            </Button>
            {isTwilioConnected && isEditing && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  (async () => {
                    setIsLoading(true);
                    const info = await fetchWorkspaceInfo();
                    setSettings(info || {});
                    setIsLoading(false);
                  })();
                }}
                className="flex items-center justify-center min-h-10 font-inter font-medium text-sm px-6 py-2 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
