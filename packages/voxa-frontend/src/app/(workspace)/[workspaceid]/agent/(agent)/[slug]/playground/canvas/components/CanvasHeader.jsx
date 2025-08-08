"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MessageSquare,
  PanelRightOpen,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { usePlayground } from "@/context/AgentContext";
import { useSource } from "@/context/SourceContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LuAlertCircle, LuCheckCircle2 } from "react-icons/lu";
import PrerequisitesPopup from "../../PrerequisitesPopup";

const CanvasHeader = () => {
  const router = useRouter();
  const params = useParams();
  const { slug, workspaceid } = params;
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [prerequisitesPopupOpen, setPrerequisitesPopupOpen] = useState(false);

  const { aiConfig, setAIConfig, publishAgent, workflowNeedsUpdate } =
    usePlayground();

  const { needsTraining } = useSource();
  const { checkAndShowPricingPopup } = useWorkspace();

  const handleBackToPlayground = () => {
    router.back();
  };

  const handlePublishAgentClick = async () => {
    // First check if user has sufficient credits (pricing popup)
    const needsPricing = checkAndShowPricingPopup();
    if (needsPricing) {
      // User needs to upgrade, pricing popup was shown
      return false;
    }

    // Check prerequisites before publishing
    const hasPrerequisites = workflowNeedsUpdate || needsTraining;

    if (hasPrerequisites) {
      setPrerequisitesPopupOpen(true);
      return false;
    }

    setIsPublishing(true);
    // Remember initial publish state before updating
    const wasPublished = aiConfig?.published;

    try {
      const res = await publishAgent(slug);
      if (res) {
        setAIConfig({ ...aiConfig, published: true });
        toast({
          title: wasPublished
            ? "Agent updated successfully"
            : "Agent published successfully",
          variant: "success",
        });
        return true;
      } else {
        toast({
          title: "Error while publishing/updating agent",
          variant: "destructive",
        });
        return false;
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddToKnowledgeBase = () => {
    // Navigate to playground with parameter to trigger knowledge base dialog
    router.push(
      `/${workspaceid}/agent/${slug}/playground?openKnowledgeBase=true`
    );
  };

  const handleConnectClick = () => {
    router.push(`/${workspaceid}/agent/${slug}/connect`);
  };

  return (
    <>
      <div
        className="w-full h-[60px] flex flex-col justify-center items-center gap-2.5 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--lines-strokes, #E4E4E7)",
          background: "var(--muted)",
          boxShadow: "0px 4px 12px -1px rgba(0, 0, 0, 0.10)",
          backdropFilter: "blur(25px)",
        }}
      >
        <div
          className="flex justify-between items-center w-full px-4"
          style={{
            maxWidth: "1284px",
          }}
        >
          {/* Left side - Back to Playground */}
          <Button
            variant="ghost"
            onClick={handleBackToPlayground}
            className="flex items-center gap-1 px-3 py-2 text-primary hover:bg-transparent"
            style={{
              fontFamily: "var(--font-family-font-sans, Geist)",
              fontSize: "text-sm",
              fontWeight: "var(--font-weight-font-medium, 500)",
              lineHeight: "leading-6",
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Playground
          </Button>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2">
            {/* Update Agent Button with Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex">
                    {aiConfig?.published ? (
                      // For published agents, just a button (not DialogTrigger)
                      <Button
                        onClick={handlePublishAgentClick}
                        disabled={isPublishing}
                        className="flex justify-center items-center gap-1 px-3 py-2 bg-primary hover:bg-primary/90 text-sm leading-6 font-medium font-sans text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPublishing ? "Updating Agent..." : "Update Agent"}
                      </Button>
                    ) : (
                      // For unpublished agents
                      <Button
                        variant="primary"
                        onClick={handlePublishAgentClick}
                        disabled={isPublishing}
                        className="flex justify-center items-center gap-1 px-3 py-2 bg-primary hover:bg-primary/90 text-sm leading-6 font-medium font-sans text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPublishing ? "Publishing Agent..." : "Publish Agent"}
                      </Button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-white border border-gray-200 shadow-lg rounded-lg p-4 max-w-sm">
                  {workflowNeedsUpdate || needsTraining ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <LuAlertCircle className="h-3.5 w-3.5 text-gray-500" />
                        <p className="font-medium text-sm text-gray-900">
                          Please finish the following steps to publish:
                        </p>
                      </div>
                      <ul className="space-y-2 ml-1">
                        {workflowNeedsUpdate && (
                          <li className="flex items-start gap-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Generate workflow with updated prompt</span>
                          </li>
                        )}
                        {needsTraining && (
                          <li className="flex items-start gap-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Train agent with updated knowledge</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LuCheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <p className="font-medium text-sm text-gray-900">
                        Ready to publish!
                      </p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Connect/Settings Button */}
            <Button
              onClick={handleConnectClick}
              className="flex items-center justify-center bg-primary hover:bg-primary/90 px-3 py-2 border-l border-primary-foreground/20 text-primary-foreground rounded-md"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Prerequisites Popup */}
      <PrerequisitesPopup
        open={prerequisitesPopupOpen}
        onOpenChange={setPrerequisitesPopupOpen}
        workflowNeedsUpdate={workflowNeedsUpdate}
        needsTraining={needsTraining}
        onAddToKnowledgeBase={handleAddToKnowledgeBase}
      />
    </>
  );
};

export default CanvasHeader;
