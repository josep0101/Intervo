import React, { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useSource } from "@/context/SourceContext";

const TextDialogSection = ({
  initialText = "",
  onTextChange,
  onClose,
  onEdit,
}) => {
  const [text, setText] = useState(initialText);
  const [originalText, setOriginalText] = useState(initialText);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();
  const { updateSourceText, sourceId, fetchSourceText } = useSource();

  const debouncedUpdate = useCallback(
    async (currentText) => {
      if (currentText === "" || currentText === originalText) return;

      if (onEdit) {
        onEdit({
          type: "text_saving_started",
        });
      }

      try {
        if (sourceId) {
          const res = await updateSourceText(sourceId, currentText);
          if (res.error) {
            toast({ title: res.error, variant: "destructive" });
          } else if (currentText !== originalText) {
            toast({ title: "Changes saved", variant: "success" });
          }
        } else if (onTextChange) {
          onTextChange(currentText);
        }
      } finally {
        if (onEdit) {
          onEdit({
            type: "text_saving_completed",
          });
        }
      }
    },
    [sourceId, originalText]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedUpdate(text);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [text, debouncedUpdate]);

  useEffect(() => {
    const fetchSource = async () => {
      try {
        if (sourceId) {
          const data = await fetchSourceText(sourceId);
          setText(data?.text || "");
          setOriginalText(data?.text || "");
        } else {
          setText(initialText);
          setOriginalText(initialText);
        }
      } catch (error) {
        toast({
          title: "Error loading text",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchSource();
  }, [sourceId, initialText]);

  const handleTextChange = (newText) => {
    setText(newText);

    // Track edit in parent component for immediate feedback
    if (onEdit && newText !== text) {
      onEdit({
        type: "text_typing",
        previousLength: text.length,
        newLength: newText.length,
        changeSize: newText.length - text.length,
      });
    }
  };

  const handleFileRead = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newText = e.target.result;
      setText(newText);

      // Track edit in parent component
      if (onEdit) {
        onEdit({
          type: "text_file_loaded",
          fileName: file.name,
          fileSize: file.size,
          previousLength: text.length,
          newLength: newText.length,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === "text/plain") {
      handleFileRead(file);
    } else {
      toast({ title: "Please drop a valid .txt file", variant: "destructive" });
    }
  };

  const handlePaste = (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type === "text/plain") {
        const file = item.getAsFile();
        handleFileRead(file);
        event.preventDefault();
        break;
      }
    }

    // Track paste event if it's text content
    if (onEdit && event.clipboardData.getData("text")) {
      onEdit({
        type: "text_pasted",
        pasteLength: event.clipboardData.getData("text").length,
      });
    }
  };

  console.log(isInitialLoading, "is Initial loading text");
  return (
    <>
      {isInitialLoading ? (
        <div className="w-full">
          <Skeleton className="h-[355px] w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-[300px]" />
        </div>
      ) : (
        <div className="w-full">
          <Textarea
            placeholder="Add company information, product details, or knowledge base content here. "
            className="text-sm resize-none text-foreground  w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onDrop={handleDrop}
            onPaste={handlePaste}
            style={{
              height: "355px",
            }}
          />
          <p className="mt-2 text-muted-foreground text-xs max-w-full whitespace-normal">
            Enter text directly to train your AI with specific information like
            business hours, policies, or frequently asked questions
          </p>
        </div>
      )}
    </>
  );
};

export default TextDialogSection;
