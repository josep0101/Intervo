import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, BookOpen, Sparkles } from "lucide-react";

const PrerequisitesPopup = ({
  open,
  onOpenChange,
  workflowNeedsUpdate,
  needsTraining,
  onAddToKnowledgeBase,
}) => {
  const handleAddToKnowledgeBase = () => {
    onAddToKnowledgeBase();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md sm:w-[512px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold font-sans leading-7 text-center flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Setup Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            To publish your agent, you need to complete the following setup:
          </div>

          <div className="space-y-3">
            {/* Workflow Generation Status */}
            {workflowNeedsUpdate && (
              <div className="flex items-center gap-3 p-3 rounded-md border bg-orange-50 border-orange-200">
                <Sparkles className="h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Generate Workflow</div>
                  <div className="text-xs text-muted-foreground">
                    Generate workflow with updated prompt
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Base Training Status */}
            {needsTraining && (
              <div className="flex items-center gap-3 p-3 rounded-md border bg-orange-50 border-orange-200">
                <BookOpen className="h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    Complete Knowledge Base Training
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Train your agent with the latest knowledge base content
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {needsTraining && (
              <Button onClick={handleAddToKnowledgeBase} className="w-full">
                Train your Agent with Knowledge Base
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrerequisitesPopup;
