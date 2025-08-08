"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useSource } from "@/context/SourceContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export const runtime = "edge";
const Page = () => {
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();
  const { updateSourceText, sourceId, fetchSourceText } = useSource();

  const debouncedUpdate = useCallback(
    async (currentText) => {
      if (currentText === "" || currentText === originalText) return;

      const res = await updateSourceText(sourceId, currentText);
      if (res.error) {
        toast({ title: res.error, variant: "destructive" });
      } else if (currentText !== originalText) {
        toast({ title: "Changes saved", variant: "success" });
        setOriginalText(currentText);
      }
    },
    [sourceId, updateSourceText, toast, originalText]
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
        const data = await fetchSourceText(sourceId);
        setText(data?.text || "");
        setOriginalText(data?.text || "");
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
  }, [sourceId, fetchSourceText, toast]);

  const handleFileRead = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target.result);
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
  };

  if (isInitialLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-[355px] w-full rounded-md" />
        <Skeleton className="mt-2 h-4 w-[300px]" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <Textarea
        placeholder="Add company information, product details, or knowledge base content here. For example:
"
        className="text-sm resize-none text-foreground h-[355px] w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onDrop={handleDrop}
        onPaste={handlePaste}
      />
      <p className="mt-2 text-muted-foreground text-xs max-w-full whitespace-normal">
        Enter text directly to train your AI with specific information like
        business hours, policies, or frequently asked questions
      </p>
    </div>
  );
};

export default Page;
