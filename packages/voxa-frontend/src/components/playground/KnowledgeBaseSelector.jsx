"use client";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ChunksViewerDialog from "./ChunksViewerDialog";
import { useAuth } from "@/context/AuthContext";
import { useSource } from "@/context/SourceContext";
import { LuAlertCircle } from "react-icons/lu";

const KnowledgeBaseSelector = ({
  onManageSource,
  knowledgeBases = [],
  selectedKnowledgeBase,
  onSelectKnowledgeBase,
}) => {
  const [isChunksViewerOpen, setIsChunksViewerOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { needsTraining } = useSource();

  const selectedKbDetails = knowledgeBases.find(
    (kb) => kb._id === selectedKnowledgeBase
  );

  return (
    <>
      <div className="w-full rounded-lg border border-border bg-card p-6 mb-4 shadow-sm">
        <h2 className="text-lg font-semibold leading-7 text-foreground mb-6">
          Knowledge Base
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="knowledge-base-select"
              className="text-sm font-medium leading-5 text-foreground mb-2 block"
            >
              Choose Knowledge Base
            </label>

            <Select
              value={selectedKnowledgeBase}
              onValueChange={onSelectKnowledgeBase}
            >
              <SelectTrigger
                id="knowledge-base-select"
                className="w-full bg-white shadow-sm"
              >
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases && knowledgeBases.length > 0 ? (
                  knowledgeBases.map((kb) => (
                    <SelectItem key={kb._id} value={kb._id}>
                      {kb.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-sources" disabled>
                    No knowledge bases available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              className="w-full flex justify-center items-center gap-1 px-3 py-2 rounded-md shadow"
              onClick={onManageSource}
            >
              Manage Knowledge base
              {needsTraining && (
                <LuAlertCircle className="h-4 w-4 text-amber-500 ml-1" />
              )}
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full flex justify-center items-center gap-1 px-3 py-2 rounded-md shadow"
                onClick={() => setIsChunksViewerOpen(true)}
                disabled={!selectedKnowledgeBase}
              >
                View Processed Chunks
              </Button>
            )}
          </div>
        </div>
      </div>
      {isAdmin && selectedKnowledgeBase && (
        <ChunksViewerDialog
          isOpen={isChunksViewerOpen}
          onOpenChange={setIsChunksViewerOpen}
          sourceId={selectedKnowledgeBase}
          knowledgeBaseName={selectedKbDetails?.name}
        />
      )}
    </>
  );
};

export default KnowledgeBaseSelector;
