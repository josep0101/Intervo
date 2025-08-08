"use client";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { LuTrash2 } from "react-icons/lu";
import { useSource } from "@/context/SourceContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const FaqSkeleton = () => (
  <div className="relative flex flex-col gap-2 p-6 border rounded-lg border-border">
    <div className="flex justify-between">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-7 w-7 rounded-md" />
    </div>
    <Skeleton className="h-8 w-full rounded-md mt-1" />
    <Skeleton className="h-5 w-20 mt-2" />
    <Skeleton className="h-16 w-full rounded-md" />
  </div>
);

export const runtime = "edge";
const Page = () => {
  const [qaList, setQaList] = useState([]);
  const { toast } = useToast();
  const [originalQaList, setOriginalQaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { updateSourceFaqs, sourceId, fetchSourceFaqs } = useSource();

  useEffect(() => {
    const fetchFaqs = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSourceFaqs(sourceId);
        const faqs = data?.faqs || [];

        // Add a default Q&A if no entries exist
        if (faqs.length === 0) {
          faqs.push({ question: "", answer: "" });
        }

        setQaList(faqs);
        setOriginalQaList(JSON.parse(JSON.stringify(faqs))); // Use deep copy like in FAQDialogSection
      } catch (error) {
        toast({
          title: "Error loading FAQs",
          description: error.message,
          variant: "destructive",
        });
        // Add a default Q&A even on error
        setQaList([{ question: "", answer: "" }]);
        setOriginalQaList([{ question: "", answer: "" }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaqs();
  }, [sourceId, fetchSourceFaqs, toast]);

  useEffect(() => {
    // Don't save if the list is exactly the same as original
    if (JSON.stringify(qaList) === JSON.stringify(originalQaList)) return;

    // Start a timer for autosave
    const timeoutId = setTimeout(async () => {
      try {
        const res = await updateSourceFaqs(sourceId, qaList);
        if (res.error) {
          toast({ title: res.error, variant: "destructive" });
        } else {
          toast({ title: "Changes saved", variant: "success" });
          // Update originalQaList to match current state after successful save
          setOriginalQaList(JSON.parse(JSON.stringify(qaList))); // Use deep copy like in FAQDialogSection
        }
      } catch (error) {
        toast({
          title: "Error saving changes",
          description: error.message,
          variant: "destructive",
        });
      }
    }, 1000); // Reduced timeout to 1 second for better responsiveness

    return () => clearTimeout(timeoutId);
  }, [qaList, sourceId, updateSourceFaqs, originalQaList, toast]);

  const handleAddQA = () => {
    const newQA = { question: "", answer: "" };
    setQaList((prev) => [newQA, ...prev]);
  };

  const handleDeleteAll = () => {
    setQaList([]);
  };

  const handleInputChange = (index, field, value) => {
    setQaList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteItem = (index) => {
    setQaList((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-[300px]" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        {[1, 2, 3].map((i) => (
          <FaqSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h6 className="text-sm font-medium text-foreground">FAQs</h6>
      <span className="text-xs text-muted-foreground">
        Define specific questions and answers to refine the AI&apos;s knowledge
        and ensure accurate responses.
      </span>
      <div className="flex gap-2">
        <Button
          className="text-sm font-medium bg-white text-foreground border border-border hover:bg-slate-50 hover:text-foreground"
          onClick={handleAddQA}
        >
          Add Q&A
        </Button>
        <Button
          className="text-sm font-medium bg-destructive text-destructive-foreground border border-destructive hover:bg-red-700"
          onClick={handleDeleteAll}
        >
          Delete all
        </Button>
      </div>

      {qaList.map((qa, index) => (
        <div
          key={index}
          className="relative flex flex-col gap-2 p-6 border rounded-lg border-border"
        >
          <div className="flex justify-between">
            <span className="text-sm font-medium">Question</span>
            <button
              onClick={() => handleDeleteItem(index)}
              className="absolute top-0 right-0 mr-1 mt-1  text-red-500 bg-destructive/[.1] min-h-7 min-w-7 rounded-md flex justify-center items-center hover:text-red-700"
            >
              <LuTrash2 />
            </button>
          </div>
          <textarea
            className="p-2 border border-input text-sm rounded-md resize-none"
            value={qa.question}
            onChange={(e) =>
              handleInputChange(index, "question", e.target.value)
            }
            rows={1}
          />
          <span className="text-sm font-medium mt-2">Answer</span>
          <textarea
            className="p-2 border border-input text-sm rounded-md resize-none"
            value={qa.answer}
            onChange={(e) => handleInputChange(index, "answer", e.target.value)}
            rows={2}
          />
        </div>
      ))}
    </div>
  );
};

export default Page;
