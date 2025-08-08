import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSource } from "@/context/SourceContext";
import Link from "next/link";

export default function KnowledgeBaseSelect({
  selectedSource: initialSource,
  onSourceChange,
}) {
  const [selectedSource, setSelectedSource] = useState(initialSource || "");
  const [sources, setSources] = useState([]);
  const { getAllSources } = useSource();

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const fetchedSources = await getAllSources();
        setSources(fetchedSources);
      } catch (error) {
        console.error("Error fetching sources:", error);
      }
    };

    fetchSources();
  }, [getAllSources]);

  const handleSourceChange = (value) => {
    setSelectedSource(value);
    onSourceChange(value);
  };

  return (
    <div className="flex justify-between items-center">
      <Select value={selectedSource} onValueChange={handleSourceChange}>
        <SelectTrigger className="w-full text-sm font-medium font-inter py-2 px-4 h-10">
          <SelectValue placeholder="Select a knowledge base" />
        </SelectTrigger>
        <SelectContent>
          {sources.map((source) => (
            <SelectItem
              key={source._id}
              value={source._id}
              className="text-sm font-medium font-inter"
            >
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
