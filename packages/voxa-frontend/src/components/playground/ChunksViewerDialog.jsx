import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSource } from "@/context/SourceContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LuTerminal } from "react-icons/lu";

const ChunkItemSkeleton = () => (
  <div className="p-4 border-b border-border">
    <Skeleton className="h-4 w-1/4 mb-2" />
    <Skeleton className="h-3 w-1/2 mb-3" />
    <Skeleton className="h-12 w-full mb-3" />
    <Skeleton className="h-3 w-1/4 mb-2" />
    <Skeleton className="h-16 w-full" />
  </div>
);

function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") {
    return "";
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const ChunksViewerDialog = ({
  isOpen,
  onOpenChange,
  sourceId,
  knowledgeBaseName,
}) => {
  const [chunksData, setChunksData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { fetchSourceChunks } = useSource();

  useEffect(() => {
    if (isOpen && sourceId) {
      const loadChunks = async () => {
        setIsLoading(true);
        setError(null);
        setChunksData(null);
        const response = await fetchSourceChunks(sourceId);
        if (response.error) {
          setError({ message: response.error, details: response.details });
          setChunksData(null);
        } else {
          // The actual chunks are in response.data.chunks as per backend structure
          setChunksData(response.data);
        }
        setIsLoading(false);
      };
      loadChunks();
    }
  }, [isOpen, sourceId, fetchSourceChunks]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-full flex flex-col"
        style={{ height: "calc(100vh - 8rem)", maxHeight: "800px" }}
      >
        <DialogHeader>
          <DialogTitle>
            Processed Chunks: {knowledgeBaseName || sourceId}
          </DialogTitle>
          <DialogDescription>
            Inspect the text chunks and associated metadata stored for this
            knowledge base.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto py-4">
          <ScrollArea className="h-full pr-4">
            {isLoading && (
              <div className="space-y-4">
                <ChunkItemSkeleton />
                <ChunkItemSkeleton />
                <ChunkItemSkeleton />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <LuTerminal className="h-4 w-4" />
                <AlertTitle>
                  {error.message || "Error Fetching Chunks"}
                </AlertTitle>
                <AlertDescription>
                  {error.details ||
                    "An unexpected error occurred. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && chunksData && (
              <div>
                <div className="mb-4 p-3 bg-muted/50 rounded-md border border-border">
                  <p className="text-sm">
                    <span className="font-semibold">Knowledge Base ID:</span>{" "}
                    {chunksData.knowledgebase_id}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Total Chunks:</span>{" "}
                    {chunksData.total_chunks}
                  </p>
                </div>
                {chunksData.chunks && chunksData.chunks.length > 0 ? (
                  chunksData.chunks.map((chunk) => (
                    <div
                      key={chunk.chunk_id}
                      className="p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors duration-150"
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-semibold text-foreground">
                          Chunk ID:
                        </span>{" "}
                        {chunk.chunk_id}
                      </p>
                      <h4 className="text-sm font-semibold mt-2 mb-1">
                        Content:
                      </h4>
                      <pre
                        style={{ wordWrap: "break-word" }}
                        className="bg-muted/70 p-3 rounded-md text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto border border-input"
                      >
                        {escapeHtml(chunk.page_content)}
                      </pre>
                      <h4 className="text-sm font-semibold mt-3 mb-1">
                        Metadata:
                      </h4>
                      <div className="bg-muted/70 p-3 rounded-md text-xs border border-input max-h-40 overflow-y-auto">
                        {chunk.metadata &&
                        Object.keys(chunk.metadata).length > 0 ? (
                          <ul className="space-y-1">
                            {Object.entries(chunk.metadata).map(
                              ([key, value]) => (
                                <li key={key} className="flex">
                                  <span className="font-semibold w-1/3 min-w-[100px] max-w-[200px] truncate pr-2">
                                    {escapeHtml(key)}:
                                  </span>
                                  <span className="whitespace-pre-wrap break-words w-2/3">
                                    {Array.isArray(value)
                                      ? value.map((item, index) => (
                                          <span
                                            key={index}
                                            className="inline-block bg-primary/10 text-primary px-2 py-1 rounded-md text-xs mr-1 mb-1"
                                          >
                                            {escapeHtml(String(item))}
                                          </span>
                                        ))
                                      : typeof value === "object"
                                      ? escapeHtml(JSON.stringify(value))
                                      : escapeHtml(String(value))}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground italic">
                            No metadata available.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No chunks found for this source, or it has not been trained
                    yet.
                  </p>
                )}
              </div>
            )}
            {!isLoading && !error && !chunksData && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data to display. If you just opened the dialog, data might
                still be loading or an issue occurred.
              </p>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="sm:justify-end border-t border-border pt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChunksViewerDialog;
