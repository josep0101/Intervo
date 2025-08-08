"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePlayground } from "@/context/AgentContext";
import { useParams, usePathname } from "next/navigation";
import { LoadingButton } from "@/components/ui/loadingButton";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ChevronRight, Lightbulb } from "lucide-react";
import { LuAlertCircle } from "react-icons/lu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function EmbeddedWelcomeDialog({
  agentType = "",
  agentPrompt = "",
  onWorkflowGenerated = () => {},
}) {
  const { slug } = useParams();
  const pathname = usePathname();
  const {
    generateWorkflowWithAI,
    updateAIConfig,
    setWorkflowUpdateNeeded,
    workflowNeedsUpdate,
  } = usePlayground();
  const { toast } = useToast();
  const [description, setDescription] = useState(agentPrompt || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const lastSavedPrompt = useRef(agentPrompt || "");
  const updateTimeoutRef = useRef(null);

  useEffect(() => {
    if (agentPrompt && agentPrompt !== lastSavedPrompt.current) {
      setDescription(agentPrompt);
      lastSavedPrompt.current = agentPrompt;
    }
  }, [agentPrompt]);

  const debouncedUpdatePrompt = useCallback(
    (newPrompt) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (newPrompt !== lastSavedPrompt.current) {
          updateAIConfig({ prompt: newPrompt }, "embedded-welcome-dialog");
          lastSavedPrompt.current = newPrompt;
        }
      }, 1000);
    },
    [updateAIConfig]
  );

  const handlePromptChange = (e) => {
    const newValue = e.target.value;
    setDescription(newValue);

    // Mark workflow as needing update when user edits prompt
    if (newValue !== lastSavedPrompt.current) {
      setWorkflowUpdateNeeded(true);
    }

    debouncedUpdatePrompt(newValue);
  };

  const generateWorkflow = async () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for your agent workflow",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      if (description !== lastSavedPrompt.current) {
        await updateAIConfig(
          { prompt: description },
          "embedded-welcome-dialog-generate"
        );
        lastSavedPrompt.current = description;
      }

      const success = await generateWorkflowWithAI(slug, description);

      if (success) {
        toast({
          title: "Success",
          description: "Workflow generated successfully!",
          variant: "success",
        });
        onWorkflowGenerated();
      } else {
        toast({
          title: "Error",
          description: "Failed to generate workflow. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating workflow:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 rounded-md border border-[#E4E4E7] bg-white">
      <h2 className="text-lg font-semibold font-sans leading-7 text-foreground">
        Prompt for the Agent
      </h2>
      <div className="relative flex-1 rounded-md p-[2px]">
        <Textarea
          className="w-full h-full px-3 py-2.5 ring-1 ring-gray-200 rounded-md resize-none"
          rows={6}
          value={description}
          onChange={handlePromptChange}
          maxLength={1000}
          placeholder="My agent to greet customers warmly, collect their contact details, and understand their service needs. Include specific greeting phrases, verification steps, and response scenarios you'd like the agent to handle"
        />
      </div>
      <div className="text-sm text-gray-500">
        {description.length}/1000 characters
      </div>
      <div className="flex flex-col gap-2 w-full">
        <LoadingButton
          className="flex w-full px-3 py-2 justify-center items-center gap-1 rounded-md bg-primary text-white"
          onClick={generateWorkflow}
          loading={isGenerating}
          disabled={!workflowNeedsUpdate}
        >
          Generate Workflow with AI
          {workflowNeedsUpdate && (
            <LuAlertCircle className="h-4 w-4 text-amber-300 ml-1" />
          )}
        </LoadingButton>
        <Link href={`${pathname}/canvas`} className="w-full">
          <Button
            variant="secondary"
            className="flex w-full px-3 py-2 justify-center items-center gap-1 rounded-md text-black shadow-[0px_1px_3px_0px_rgba(0,0,0,0.10),0px_1px_2px_-1px_rgba(0,0,0,0.10)]"
          >
            Edit Workflow
          </Button>
        </Link>
      </div>

      <Collapsible className="w-full bg-gray-100 rounded-[16px] overflow-hidden">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-sm hover:bg-gray-200/50 transition-colors">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500" />
            <span className="font-medium">Pro Tips</span>
          </div>
          <ChevronRight
            size={14}
            className="text-muted-foreground transition-transform duration-200 ease-in-out ui-expanded:rotate-90"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3 pt-0 text-sm text-gray-600 space-y-1">
          <ul className="list-disc list-inside space-y-1.5">
            <li>Be specific about greeting preferences and tone</li>
            <li>Include verification steps and security requirements</li>
            <li>Describe different customer scenario handling</li>
            <li>Add specific brand voice guidelines</li>
            <li>500-2000 characters for optimal results</li>
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
