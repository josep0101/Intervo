"use client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useSource } from "@/context/SourceContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";

const Sources = ({ sourceType }) => {
  const {
    retrainSource,
    sourceId,
    getASourceById,
    totalDetectedCharacters,
    isLoadingTotalDetectedCharacters,
  } = useSource();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState({});

  const fetchSource = useCallback(async () => {
    if (!sourceId) return;
    setIsLoading(true);
    try {
      const res = await getASourceById(sourceId);
      setSource(res);
    } catch (error) {
      console.error("Error fetching source:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sourceId, getASourceById]);

  const handleRetrainButtonClick = async () => {
    toast({ title: "Retraining", variant: "success" });
    const res = await retrainSource(sourceId, sourceType);
    if (res.error) {
      toast({ title: res.error, variant: "destructive" });
    } else {
      toast({ title: res.message, variant: "success" });
      fetchSource();
    }
  };

  useEffect(() => {
    if (sourceId) {
      fetchSource();
    }
  }, [sourceId, fetchSource]);

  const getSourceText = (characters) => {
    let msg = "";
    switch (source.sourceType) {
      case "faq":
        msg = `One Faq source (${characters} detected chars)`;
        break;
      case "file":
        msg = `${
          source.difyDocumentIds?.file?.length || 0
        } files (${characters} detected chars)`;
        break;
      case "text":
        msg = `One Text source (${characters} detected chars)`;
        break;
      case "website":
        msg = `${
          source.difyDocumentIds?.website?.length || 0
        } Links (${characters} detected chars)`;
        break;
      default:
        break;
    }
    return msg;
  };

  if (isLoading) return <>Loading....</>;

  return (
    <Card className="space-y-4 p-4 flex flex-col">
      <CardTitle className="text-center leading-6">Sources</CardTitle>
      <p className="text-sm">
        {getSourceText(
          isLoadingTotalDetectedCharacters
            ? "..."
            : parseInt(totalDetectedCharacters || 0, 10).toLocaleString()
        )}
      </p>
      <div className="font-semibold text-sm">
        <p>Total detected characters</p>
        <p className="text-center">
          {isLoadingTotalDetectedCharacters
            ? "Loading..."
            : parseInt(totalDetectedCharacters || 0, 10).toLocaleString()}
          <span className="text-muted-foreground font-medium">
            / 400,000 limit
          </span>
        </p>
      </div>
      <Button
        className="flex py-2 px-4 text-white justify-center text-sm font-medium items-center gap-2 self-stretch rounded-[calc(var(--radius)-2px)] bg-primary"
        onClick={handleRetrainButtonClick}
      >
        Retrain Agent
      </Button>
    </Card>
  );
};

export default Sources;
