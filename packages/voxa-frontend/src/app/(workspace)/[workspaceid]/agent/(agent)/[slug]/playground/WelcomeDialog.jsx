"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { usePlayground } from "@/context/AgentContext";
import { useParams, usePathname } from "next/navigation";
import { LoadingButton } from "@/components/ui/loadingButton";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ChevronRight, Lightbulb } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  StepIndicator,
  DialogHeader as CustomDialogHeader,
} from "@/components/ui/stepper";

// Utility function to get cookie value
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop().split(";").shift());
  return null;
};

// Utility function to delete cookie
const deleteCookie = (name) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; domain=.voxa.ai; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

export default function WelcomeDialog({
  isOpen,
  onOpenChange,
  agentType = "",
  agentPrompt = "",
  onWorkflowGenerated = () => {},
  embedded = false,
  onPromptChange = null,
}) {
  const { slug } = useParams();
  const pathname = usePathname();
  const { generateWorkflowWithAI } = usePlayground();
  const { toast } = useToast();
  const [description, setDescription] = useState(agentPrompt || "");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (agentPrompt) {
      setDescription(agentPrompt);
    }
  }, [agentPrompt]);

  // Check for voxa_prompt cookie only for non-embedded version
  useEffect(() => {
    if (!embedded && isOpen) {
      const promptCookie = getCookie("voxa_prompt");
      if (promptCookie) {
        const defaultText = agentPrompt;
        const combinedText = `${promptCookie}\n\n---\n\n${defaultText}`;
        setDescription(combinedText);
        // Delete the cookie after reading it
        deleteCookie("voxa_prompt");
      }
    }
  }, [embedded, isOpen]);

  useEffect(() => {
    if (embedded && onPromptChange && description !== agentPrompt) {
      onPromptChange(description);
    }
  }, [description, embedded, agentPrompt]);

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
      const success = await generateWorkflowWithAI(slug, description);

      if (success) {
        toast({
          title: "Success",
          description: "Workflow generated successfully!",
          variant: "success",
        });
        if (!embedded) {
          onOpenChange(false);
        }
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

  if (embedded) {
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
            onChange={(e) => setDescription(e.target.value)}
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
          >
            Generate Workflow with AI
          </LoadingButton>
          <Link href={`${pathname}/canvas`} className="w-full">
            <Button className="flex w-full px-3 py-2 justify-center items-center gap-1 rounded-md bg-secondary text-black shadow-[0px_1px_3px_0px_rgba(0,0,0,0.10),0px_1px_2px_-1px_rgba(0,0,0,0.10)] hover:bg-secondary/80 transition-colors">
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={true}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="gap-4"
      >
        <StepIndicator
          steps={["Agent", "Prompt", "Knowledge"]}
          currentStep={1}
        />
        <div className="w-full h-px bg-gray-200 mb-4"></div>
        <CustomDialogHeader
          title={"Add a prompt"}
          subtitle="Add a new agent into your business"
          showSeparator={false}
        />

        <div className="relative border-[2px] rounded-md p-[2px] border-primary">
          <Textarea
            className="w-full px-3 py-2.5 ring-1 ring-gray-200 rounded-md resize-none overflow-y-auto"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="My agent to greet customers warmly, collect their contact details, and understand their service needs. Include specific greeting phrases, verification steps, and response scenarios you'd like the agent to handle"
          />
        </div>
        <div className="text-sm text-gray-500 text-right mt-1">
          {description.length}/1000 characters
        </div>
        <LoadingButton
          className="w-full h-12 text-base bg-[#0F172A] hover:bg-[#0F172A]/90"
          onClick={generateWorkflow}
          loading={isGenerating}
        >
          Generate Workflow with AI
        </LoadingButton>

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
      </DialogContent>
    </Dialog>
  );
}
