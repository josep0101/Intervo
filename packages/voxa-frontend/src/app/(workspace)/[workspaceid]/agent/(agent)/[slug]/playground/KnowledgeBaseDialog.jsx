import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import FilesDialogSection from "@/components/playground/FilesDialogSection";
import TextDialogSection from "@/components/playground/TextDialogSection";
import WebsiteDialogSection from "@/components/playground/WebsiteDialogSection";
import FAQDialogSection from "@/components/playground/FAQDialogSection";
import { useSource } from "@/context/SourceContext";
import { usePlayground } from "@/context/AgentContext";
import { useToast } from "@/hooks/use-toast";
import { LuLoader2, LuCheckCircle } from "react-icons/lu";
import {
  StepIndicator,
  DialogHeader as CustomDialogHeader,
} from "@/components/ui/stepper";

const KnowledgeBaseDialog = ({
  isOpen,
  onOpenChange,
  isManageMode = false,
  knowledgeBaseName = "",
}) => {
  const {
    retrainSource,
    sourceId: sourceExists = true,
    getASourceById,
    totalDetectedCharacters,
    isLoadingTotalDetectedCharacters,
    setTrainingNeeded,
    needsTraining,
  } = useSource();
  const { incrementAgentVersion } = usePlayground();
  const { toast } = useToast();
  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);

  // State to track edits in each tab component
  const [editTracking, setEditTracking] = useState({
    files: {
      hasEdits: false,
      lastEditTimestamp: null,
      editCount: 0,
      editDetails: [],
      isSaving: false,
    },
    text: {
      hasEdits: false,
      lastEditTimestamp: null,
      editCount: 0,
      editDetails: [],
      isSaving: false,
    },
    website: {
      hasEdits: false,
      lastEditTimestamp: null,
      editCount: 0,
      editDetails: [],
      isSaving: false,
    },
    faq: {
      hasEdits: false,
      lastEditTimestamp: null,
      editCount: 0,
      editDetails: [],
      isSaving: false,
    },
  });

  // Function to track edits from any child component
  const trackEdit = (tabName, editDetail) => {
    // Reset training complete state if user starts editing after training was complete
    if (trainingComplete) {
      setTrainingComplete(false);
    }

    // Check if this is an actual edit that requires training
    const actualEditTypes = [
      "files_upload_complete",
      "files_delete_complete",
      "text_updated",
      "text_typing",
      "text_file_loaded",
      "text_pasted",
      "website_crawl_complete",
      "website_recrawl_complete",
      "website_crawl_more_complete",
      "website_delete_urls_complete",
      "faq_updated",
      "faq_added",
      "faq_delete_all",
      "faq_field_update",
      "faq_item_deleted",
    ];

    if (actualEditTypes.includes(editDetail.type)) {
      setTrainingNeeded(true);
    }

    setEditTracking((prev) => {
      const timestamp = new Date().toISOString();
      const isSaving =
        editDetail.type === "text_saving_started" ||
        editDetail.type === "faq_saving_started" ||
        editDetail.type === "website_saving_started" ||
        editDetail.type === "files_saving_started"
          ? true
          : editDetail.type === "text_saving_completed" ||
            editDetail.type === "faq_saving_completed" ||
            editDetail.type === "website_saving_completed" ||
            editDetail.type === "files_saving_completed"
          ? false
          : prev[tabName].isSaving;

      return {
        ...prev,
        [tabName]: {
          hasEdits: true,
          lastEditTimestamp: timestamp,
          editCount: prev[tabName].editCount + 1,
          editDetails: [
            ...prev[tabName].editDetails,
            { ...editDetail, timestamp },
          ],
          isSaving,
        },
      };
    });
  };

  // Check if any tab is currently saving
  const isAnyTabSaving = useMemo(() => {
    return Object.values(editTracking).some((tab) => tab.isSaving);
  }, [editTracking]);

  // Check if any tab has pending changes (edits made but not yet saved)
  const isAnyTabPendingSave = useMemo(() => {
    const actualEditTypes = {
      files: ["files_upload_complete", "files_delete_complete"],
      text: ["text_updated", "text_typing", "text_file_loaded", "text_pasted"],
      website: [
        "website_crawl_complete",
        "website_recrawl_complete",
        "website_crawl_more_complete",
        "website_delete_urls_complete",
      ],
      faq: [
        "faq_updated",
        "faq_added",
        "faq_delete_all",
        "faq_field_update",
        "faq_item_deleted",
      ],
    };

    const saveCompletionTypes = {
      files: ["files_saving_completed"],
      text: ["text_saving_completed"],
      website: ["website_saving_completed"],
      faq: ["faq_saving_completed"],
    };

    return Object.keys(editTracking).some((tabName) => {
      const tab = editTracking[tabName];

      // Exclude 'files' tab from triggering "Preparing to Save..."
      // File operations are typically more direct and don't need this debounce indicator.
      if (tabName === "files" || tabName === "website") {
        return false;
      }

      // If tab is currently saving, it's not pending
      if (tab.isSaving) return false;

      // Get the most recent actual edit
      const recentActualEdits = tab.editDetails.filter((edit) =>
        actualEditTypes[tabName].includes(edit.type)
      );

      if (recentActualEdits.length === 0) return false;

      const lastActualEdit = recentActualEdits[recentActualEdits.length - 1];

      // Check if there's a save completion after (or at the same time as) the last actual edit
      const saveCompletionsAfterLastEdit = tab.editDetails.filter((edit) => {
        const isAfterOrAtLastEdit = edit.timestamp >= lastActualEdit.timestamp;
        const isSaveCompletion = saveCompletionTypes[tabName].includes(
          edit.type
        );
        return isAfterOrAtLastEdit && isSaveCompletion;
      });

      // If there's no save completion after the last actual edit, it's still pending
      return saveCompletionsAfterLastEdit.length === 0;
    });
  }, [editTracking]);

  // Reset edit tracking and states when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setIsTraining(false);
      setTrainingComplete(false);
      setEditTracking({
        files: {
          hasEdits: false,
          lastEditTimestamp: null,
          editCount: 0,
          editDetails: [],
          isSaving: false,
        },
        text: {
          hasEdits: false,
          lastEditTimestamp: null,
          editCount: 0,
          editDetails: [],
          isSaving: false,
        },
        website: {
          hasEdits: false,
          lastEditTimestamp: null,
          editCount: 0,
          editDetails: [],
          isSaving: false,
        },
        faq: {
          hasEdits: false,
          lastEditTimestamp: null,
          editCount: 0,
          editDetails: [],
          isSaving: false,
        },
      });
    }
  }, [isOpen]);

  // Check if user has made actual edits (not just loading/fetching data)
  const hasActualEdits = useMemo(() => {
    // Define which edit types are considered actual edits vs. just loading/fetching
    const actualEditTypes = {
      files: ["files_upload_complete", "files_delete_complete"],
      text: ["text_updated", "text_typing", "text_file_loaded", "text_pasted"],
      website: [
        "website_crawl_complete",
        "website_recrawl_complete",
        "website_crawl_more_complete",
        "website_delete_urls_complete",
      ],
      faq: [
        "faq_updated",
        "faq_added",
        "faq_delete_all",
        "faq_field_update",
        "faq_item_deleted",
      ],
    };

    // Check if any tab has actual edits
    return Object.keys(editTracking).some((tabName) => {
      const tabEdits = editTracking[tabName].editDetails;
      return tabEdits.some((edit) =>
        actualEditTypes[tabName].includes(edit.type)
      );
    });
  }, [editTracking]);

  const handleTrainAgent = async () => {
    setIsTraining(true);
    setTrainingComplete(false);
    toast({ title: "Retraining", variant: "success" });

    try {
      const res = await retrainSource(sourceExists);

      if (res.error) {
        toast({ title: res.error, variant: "destructive" });
        setIsTraining(false);
      } else {
        toast({
          title: res.message || "Agent trained successfully",
          variant: "success",
        });
        setTrainingComplete(true);
        setIsTraining(false);
        // Don't close automatically, let user click "Continue to Agent"
      }
    } catch (error) {
      toast({
        title: "Training failed",
        description: error.message,
        variant: "destructive",
      });
      setIsTraining(false);
    }
  };

  const handleContinueToAgent = () => {
    handleOpenChange(false);
  };

  const handleSkip = () => {
    // Call the incrementAgentVersion function from AgentContext
    incrementAgentVersion();
  };

  // Handle dialog close from any method (including clicking outside)
  const handleOpenChange = (open) => {
    // If dialog is closing and there are no edits and training isn't complete, increment agent version
    incrementAgentVersion();
    // Call the original onOpenChange
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent
        className="gap-2 p-6 overflow-hidden w-full"
        style={{
          height: "732px !important",
          minHeight: "732px",
          maxHeight: "732px",
        }}
      >
        {!isManageMode && (
          <StepIndicator
            steps={["Agent", "Prompt", "Knowledge"]}
            currentStep={2}
          />
        )}
        {!isManageMode && <div className="w-full h-px bg-gray-200 mb-4"></div>}

        <CustomDialogHeader
          title={
            isManageMode && knowledgeBaseName
              ? knowledgeBaseName
              : "Add a Knowledge base"
          }
          subtitle={
            isManageMode
              ? "Update your knowledge base to improve your AI agent's responses"
              : "Upload files, add text, crawl websites, or create FAQs to train your AI agent's response"
          }
          showSeparator={false}
        />

        <div style={{ height: "440px" }}>
          <Tabs defaultValue="files" className="w-full h-full">
            <TabsList className="grid grid-cols-4 w-full h-11">
              <TabsTrigger value="files" className="h-9">
                Files
              </TabsTrigger>
              <TabsTrigger value="text" className="h-9">
                Text
              </TabsTrigger>
              <TabsTrigger value="website" className="h-9">
                Website
              </TabsTrigger>
              <TabsTrigger value="faq" className="h-9">
                FAQ
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="files"
              className="mt-4 flex-1 overflow-scroll h-[400px]"
            >
              <ScrollArea className="h-full w-full">
                <FilesDialogSection
                  onEdit={(editDetail) => trackEdit("files", editDetail)}
                />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="text" className="mt-4">
              <ScrollArea className="h-full w-full">
                <TextDialogSection
                  onEdit={(editDetail) => trackEdit("text", editDetail)}
                />
              </ScrollArea>
            </TabsContent>
            <TabsContent
              value="website"
              className="mt-4 h-[400px] overflow-scroll"
            >
              <ScrollArea
                className="h-full w-full"
                scrollAreaViewportStyle={{ width: "97%" }}
              >
                <WebsiteDialogSection
                  onEdit={(editDetail) => trackEdit("website", editDetail)}
                />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="faq" className="mt-4 h-[400px] overflow-scroll">
              <ScrollArea className="h-full w-full">
                <FAQDialogSection
                  onEdit={(editDetail) => trackEdit("faq", editDetail)}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        {/* Retrain Section */}

        <div className="flex flex-col gap-2 font-sans">
          {false && (
            <>
              <h6 className="text-sm font-semibold text-[#09090B] leading-5">
                Total detected characters
              </h6>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-[#09090B] leading-5">
                  37,328{" "}
                  <span
                    className="text-xs leading-5"
                    style={{ color: "#71717A" }}
                  >
                    / 400,000
                  </span>
                </p>
                <p
                  className="text-sm font-medium leading-5"
                  style={{ color: "#3F3F46", fontWeight: "400" }}
                >
                  9 Links (37,328 detected chars)
                </p>
              </div>
            </>
          )}
          <div className="flex w-full flex-col gap-2">
            {trainingComplete ? (
              <Button
                className="text-sm font-medium bg-green-600 hover:bg-green-700 h-10 text-white border border-green-600 transition-colors"
                onClick={handleContinueToAgent}
              >
                <LuCheckCircle className="mr-2 h-4 w-4" />
                All Done, Continue to Agent
              </Button>
            ) : (
              <Button
                className="text-sm font-medium bg-primary h-10 text-primary-foreground border border-border"
                onClick={handleTrainAgent}
                disabled={
                  (!needsTraining && !hasActualEdits) ||
                  isTraining ||
                  isAnyTabSaving ||
                  isAnyTabPendingSave
                }
              >
                {isTraining ? (
                  <>
                    <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Training Agent...
                  </>
                ) : isAnyTabSaving ? (
                  <>
                    <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Updates...
                  </>
                ) : isAnyTabPendingSave ? (
                  <>
                    <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing to Save...
                  </>
                ) : sourceExists ? (
                  "Train Agent"
                ) : (
                  "Add Knowledgebase & Train Agent"
                )}
              </Button>
            )}
            {!hasActualEdits && !trainingComplete && (
              <DialogClose asChild>
                <Button
                  className="text-sm font-medium bg-secondary hover:bg-secondary/80 h-10 text-primary border border-border"
                  onClick={handleSkip}
                >
                  Skip
                </Button>
              </DialogClose>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeBaseDialog;
