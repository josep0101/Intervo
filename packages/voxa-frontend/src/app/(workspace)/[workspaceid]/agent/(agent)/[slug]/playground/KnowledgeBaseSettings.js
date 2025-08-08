import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Book } from "lucide-react";
import { useSource } from "@/context/SourceContext";
import { usePlayground } from "@/context/AgentContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import Link from "next/link";

export default function KnowledgeBaseSettings() {
  const { workspaceId } = useWorkspace();
  const [selectedSource, setSelectedSource] = useState("");
  const [sources, setSources] = useState([]);
  const { getAllSources } = useSource();
  const { aiConfig, updateAIConfig } = usePlayground();

  // Fetch sources on component mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const fetchedSources = await getAllSources();
        setSources(fetchedSources);

        // If aiConfig has a selected source, set it
        if (aiConfig?.knowledgeBase?.sources?.[0]) {
          setSelectedSource(aiConfig.knowledgeBase.sources[0]);
        }
      } catch (error) {
        console.error("Error fetching sources:", error);
      }
    };

    fetchSources();
  }, [getAllSources, aiConfig?.knowledgeBase?.sources]);

  const handleSourceChange = async (value) => {
    console.log(value, "value");
    setSelectedSource(value);
    // Update the aiConfig with the new knowledge base selection in the correct format
    await updateAIConfig({
      knowledgeBase: {
        sources: [value],
      },
    });
  };

  return (
    <Card className="p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Book className="w-6 h-6" />
        <span className="text-md font-semibold">Knowledge Base</span>
      </div>

      <Separator />

      {/* Knowledge Base Source Selection */}
      <div className="space-y-2">
        <Label className="font-semibold">Select a Source</Label>
        <Select
          value={selectedSource}
          onValueChange={handleSourceChange}
          searchable
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="No Source Selected" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((source) => (
              <SelectItem key={source._id} value={source._id}>
                {source.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Link to Sources */}
      <div className="mt-4 flex justify-end">
        <Link
          href={`/${workspaceId}/studio?page=knowledgebase`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Add Source
        </Link>
      </div>
    </Card>
  );
}
