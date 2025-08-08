"use client";
export const runtime = "edge";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Agents from "./Agents";
import Sources from "./Sources";
import { SourceProvider } from "@/context/SourceContext";
import { Search } from "lucide-react";
import Fuse from "fuse.js";
import { useSearchParams } from "next/navigation";

// Utility function to get cookie value
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop().split(";").shift());
  return null;
};

const Page = () => {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [shouldOpenCreateModal, setShouldOpenCreateModal] = useState(false);
  const searchParams = useSearchParams();
  const [defaultSelected, setDefaultSelected] = useState(
    searchParams.get("page") || "agents"
  );

  useEffect(() => {
    // Check for voxa_prompt cookie on page load
    const promptCookie = getCookie("voxa_prompt");
    if (promptCookie) {
      setShouldOpenCreateModal(true);
      // Delete the cookie after reading it
    }
  }, []);

  const fuseOptions = {
    keys: ["name"],
  };

  const handleSearchInputChange = (searchTerm) => {
    if (searchTerm === "") {
      setIsSearching(false);
      setFiltered([]);
      return;
    }
    setIsSearching(true);
    const fuse = new Fuse(items, fuseOptions);
    const results = fuse.search(searchTerm);
    setFiltered(results.map((entry) => entry.item));
  };

  return (
    <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-6 p-2">
      <SourceProvider>
        <Tabs defaultValue={defaultSelected} className="w-full">
          <div className="flex justify-between w-full gap-2 max-sm:flex-col">
            <TabsList className="flex h-10 w-[169px] bg-secondary">
              <TabsTrigger
                value="agents"
                className="font-medium font-sans leading-5 text-sm px-3 py-1.5 w-[64px]"
              >
                Agents
              </TabsTrigger>
              <TabsTrigger
                value="knowledgebase"
                className="font-medium font-sans leading-5 text-sm px-3 py-1.5 flex-grow"
              >
                Knowledge
              </TabsTrigger>
            </TabsList>
            <div className="text-secondaryText py-2.5 px-3 border border-input bg-white truncate w-[305px] max-sm:min-w-full rounded-lg max-h-[40px] flex items-center justify-center">
              <Search className="h-4 w-4 mr-2" />
              <input
                placeholder="Type a command or search..."
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="appearance-none border-none outline-none p-0 m-0 bg-transparent w-full focus:ring-0 text-sm leading-5"
              />
            </div>
          </div>
          <TabsContent value="agents" className="mx-auto">
            <Agents
              setItems={setItems}
              filtered={isSearching && filtered.length >= 0 ? filtered : items}
              setIsSearching={setIsSearching}
              shouldOpenCreateModal={shouldOpenCreateModal}
              setShouldOpenCreateModal={setShouldOpenCreateModal}
            />
          </TabsContent>
          <TabsContent value="knowledgebase">
            <Sources
              setItems={setItems}
              filtered={isSearching && filtered.length >= 0 ? filtered : items}
              setIsSearching={setIsSearching}
            />
          </TabsContent>
        </Tabs>
      </SourceProvider>
    </div>
  );
};

export default Page;
