"use client";
export const runtime = "edge";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Title } from "@/components/ui/title";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import TimezoneSelect from "@/components/shared/TimezoneSelect";

const Page = () => {
  const { toast } = useToast();
  const {
    updateWorkspaceInformation,
    workpaceInfo,
    setWorkspaceInfo,
    fetchWorkspaceInfo,
    deleteWorkspace,
    workspaceId,
  } = useWorkspace();
  const router = useRouter();

  const [settings, setSettings] = useState(workpaceInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    (async () => {
      setSettings(await fetchWorkspaceInfo());
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateWorkspace = async () => {
    // Validate Workspace Name
    if (!settings?.name || settings.name.trim() === "") {
      toast({
        title: "Workspace name cannot be empty.",
        variant: "destructive",
      });
      return; // Prevent API call if validation fails
    }

    setWorkspaceInfo(settings);
    const res = await updateWorkspaceInformation(settings);
    if (res.message) toast({ title: res.message, variant: "success" });
    else toast({ title: res.error, variant: "destructive" });
  };

  const handleDeleteWorkspace = async () => {
    const res = await deleteWorkspace(workspaceId);
    if (res.message) {
      toast({ title: res.message, variant: "success" });
      router.push("/");
    } else toast({ title: res.error, variant: "destructive" });
    setShowDeleteDialog(false);
  };

  if (isLoading) return <>Loading...</>;
  else
    return (
      <div className="flex flex-col items-start">
        <Title subTitle={true}>General Settings</Title>
        <div className="flex gap-8 flex-col w-full">
          <div className="space-y-2 mt-8">
            <label className="text-sm font-medium leading-5 text-foreground font-sans">
              Workspace Name
            </label>
            <Input
              placeholder="Your workspace name"
              value={settings?.name}
              onChange={(e) =>
                setSettings({ ...settings, name: e.target.value })
              }
              className="w-full md:max-w-[556px]"
            />
            <p className="text-muted-foreground font-sans text-sm leading-5">
              This name will be used to identify your workspace across
              Voxa.ai.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-5 text-foreground font-sans">
              Time Zone
            </label>
            <TimezoneSelect
              value={settings?.timezone || ""}
              onValueChange={(newTimezone) =>
                setSettings({ ...settings, timezone: newTimezone })
              }
              triggerClassName="w-full md:max-w-[556px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-5 text-foreground font-sans">
              Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-border flex items-center justify-center overflow-hidden">
                {settings?.imageUrl ? (
                  <img
                    src={settings.imageUrl}
                    alt="Workspace"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-medium text-muted-foreground">
                    {settings?.name
                      ?.split(" ")
                      .slice(0, 2)
                      .map((word) => word.charAt(0)?.toUpperCase())
                      .join("") || "?"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                    }
                  }}
                  className="w-full h-10 pt-2"
                />
                <p className="text-zinc-500 text-sm leading-5 font-sans">
                  Supported formats: JPEG, PNG. Max size:{" "}
                  <span className="font-medium">2MB</span>, dimensions:
                  <span className="font-medium">200×200px</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2.5 w-full justify-between">
            <Button
              className="p-0 text-white flex bg-zinc-900 items-center justify-center min-h-9 w-[128px] font-inter font-medium text-sm hover:bg-zinc-700"
              onClick={handleUpdateWorkspace}
            >
              Save Settings
            </Button>
            <Button
              className="p-0 flex bg-red-600 items-center justify-center min-h-9 w-[221px] font-inter font-medium text-sm text-white hover:bg-red-500"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete all Data & Workspace
            </Button>
          </div>
        </div>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="w-full max-w-[423px]">
            <DialogHeader>
              <DialogTitle>Delete Workspace</DialogTitle>
              <DialogDescription>
                You are about to delete{" "}
                <span className="text-destructive font-medium">
                  {settings?.name}
                </span>{" "}
                and all of its data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-between gap-8">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Keep Workspace
              </Button>
              <Button variant="destructive" onClick={handleDeleteWorkspace}>
                I understand, Delete now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
};

export default Page;
