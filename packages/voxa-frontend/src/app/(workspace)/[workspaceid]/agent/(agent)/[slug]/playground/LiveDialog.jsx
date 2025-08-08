import React from "react";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loadingButton";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { usePlayground } from "@/context/AgentContext";

const LiveDialog = ({
  open,
  handlePublishAgentClick,
  agentId,
  phoneNumber,
  recentlyPublished,
  workspaceId,
}) => {
  // const { toast } = useToast(handlePublishAgentClick);
  const [isLoading, setIsLoading] = useState(true);
  const [copystatus, setCopystatus] = useState("Copy");
  const router = useRouter();
  const params = useParams();
  const { aiConfig } = usePlayground();

  useEffect(() => {
    console.log("noice");
    if (open !== true) return;
    if (recentlyPublished) {
      setIsLoading(false);
      return;
    }
    const execute = () => {
      console.log("text executed");
      setIsLoading(true);
      handlePublishAgentClick();
      setIsLoading(false);
    };
    execute();
  }, [open, recentlyPublished, handlePublishAgentClick]);

  if (isLoading) {
    return (
      <DialogContent className="w-full max-w-md sm:w-[512px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Loading...
          </DialogTitle>
        </DialogHeader>
      </DialogContent>
    );
  } else
    return (
      <DialogContent className="w-full max-w-md sm:w-[512px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold font-sans leading-7 text-center">
            🎉 Congrats, your agent is ready!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {aiConfig?.preferredSetupType === "widget" ? (
            <>
              <div className="w-full max-w-xs mx-auto sm:w-[400px] px-3 py-2 text-center bg-secondary rounded-md font-sans font-medium text-sm leading-6">
                You can now connect the agent to your website
              </div>

              <DialogFooter className="!justify-center flex-wrap gap-2">
                <DialogClose asChild>
                  <Button
                    type="button"
                    className="px-3 py-2 h-10 bg-background text-primary border border-border rounded-md text-sm leading-6 font-medium font-sans w-full sm:w-auto flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
                  >
                    Close
                  </Button>
                </DialogClose>

                <LoadingButton
                  className="px-3 py-2 h-10 bg-primary rounded-md text-sm leading-6 font-medium font-sans w-full sm:w-auto flex items-center justify-center"
                  onClick={() => {
                    const { workspaceid, slug } = params;
                    router.push(`/${workspaceid}/agent/${slug}/connect`);
                  }}
                  type="submit"
                >
                  Configure Widget
                </LoadingButton>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="w-full max-w-xs mx-auto sm:w-[400px] px-3 py-2 text-center bg-secondary rounded-md font-sans font-medium text-sm leading-6">
                {phoneNumber
                  ? "Your phone agent is ready to receive calls"
                  : "You need to set up a phone number to make/receive calls"}
              </div>

              {phoneNumber && (
                <div
                  className="w-[400px] hover:cursor-pointer m-auto px-3 py-2 gap-1 flex items-center justify-center bg-secondary rounded-md font-sans font-medium text-sm leading-6"
                  onClick={() => {
                    navigator.clipboard.writeText(phoneNumber);
                    setCopystatus("Copied");
                  }}
                >
                  <Copy className="w-4 h-4" /> {copystatus} {phoneNumber}
                </div>
              )}

              <DialogFooter className="!justify-center flex-wrap gap-2">
                <DialogClose asChild>
                  <Button
                    type="button"
                    className="px-3 py-2 h-10 bg-background text-primary border border-border rounded-md text-sm leading-6 font-medium font-sans w-full sm:w-auto flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
                  >
                    Close
                  </Button>
                </DialogClose>

                {!phoneNumber && (
                  <LoadingButton
                    className="px-3 py-2 h-10 bg-primary rounded-md text-sm leading-6 font-medium font-sans w-full sm:w-auto flex items-center justify-center"
                    onClick={() => {
                      router.push(`/${params.workspaceid}/phonenumber`);
                    }}
                    type="submit"
                  >
                    Configure Phone Number
                  </LoadingButton>
                )}
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    );
};

export default LiveDialog;
