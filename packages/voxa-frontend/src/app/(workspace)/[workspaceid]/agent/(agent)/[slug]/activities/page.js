"use client";
import Container from "@/components/ui/Container";
import { use, useEffect, useState } from "react";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import { IoAddCircleOutline } from "react-icons/io5";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivities } from "@/context/ActivitiesContext";
import ChatLog from "./ChatLog";
import Leads from "./Leads";
import Boards from "./Boards";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Search } from "lucide-react";

export const runtime = "edge";

const Page = ({ params: paramsProp }) => {
  const params = use(paramsProp);
  const agentId = params?.slug;
  const { setDateRange, dateRange, fetchData, activeTab, setActiveTab } =
    useActivities();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize dateRange from localStorage or set to default
  useEffect(() => {
    if (isInitialized || !agentId) {
      return; // Don't run if already initialized or no agentId
    }

    let rangeToSet = null;
    if (typeof window !== "undefined") {
      try {
        const voxaStorage = localStorage.getItem("voxa");
        if (voxaStorage) {
          const parsedStorage = JSON.parse(voxaStorage);
          if (parsedStorage?.[agentId]?.from && parsedStorage?.[agentId]?.to) {
            rangeToSet = {
              from: new Date(parsedStorage[agentId].from),
              to: new Date(parsedStorage[agentId].to),
            };
          }
        }
      } catch (error) {
        console.error("Error loading date range from localStorage:", error);
      }
    }

    if (rangeToSet) {
      setDateRange(rangeToSet);
    } else if (!dateRange?.from || !dateRange?.to) {
      // Only set default if no range from localStorage AND no pre-existing range from context/props
      const today = new Date();
      const startOfDay = new Date(new Date(today).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(today).setHours(23, 59, 59, 999));
      setDateRange({ from: startOfDay, to: endOfDay });
    }

    setIsInitialized(true); // Mark as initialized after attempting to set the dateRange
  }, [agentId, dateRange, isInitialized]);

  // Save dateRange to localStorage when it changes
  useEffect(() => {
    if (
      isInitialized &&
      typeof window !== "undefined" &&
      dateRange?.from &&
      dateRange?.to &&
      agentId
    ) {
      try {
        const voxaStorageString = localStorage.getItem("voxa");
        let voxaStorage = {};
        if (voxaStorageString) {
          try {
            const parsed = JSON.parse(voxaStorageString);
            if (typeof parsed === "object" && parsed !== null) {
              voxaStorage = parsed;
            } else {
              console.warn(
                "Invalid 'voxa' localStorage data structure, resetting."
              );
              // voxaStorage is already {}
            }
          } catch (e) {
            console.warn(
              "Corrupted 'voxa' localStorage data on parse, resetting.",
              e
            );
            // voxaStorage is already {}
          }
        }

        voxaStorage[agentId] = {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        };
        localStorage.setItem("voxa", JSON.stringify(voxaStorage));
      } catch (error) {
        console.error("Error saving date range to localStorage:", error);
      }
    }
  }, [dateRange, agentId, isInitialized]);

  // Only fetch when dateRange is actually set and component is initialized
  useEffect(() => {
    if (isInitialized && dateRange?.from && dateRange?.to) {
      fetchData();
    }
  }, [dateRange, isInitialized]); // Removed fetchData from dependencies to prevent loops if it's unstable

  return (
    <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-6 -mt-3">
      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row justify-start sm:justify-between  px-3 pb-1 items-start sm:items-center w-full max-w-full">
          <TabsList className="h-auto sm:h-11 flex-col sm:flex-row bg-[#F1F5F9] font-sans text-sm leading-6 font-medium w-full sm:w-auto">
            <TabsTrigger value="boards" className="h-9 w-full sm:w-[130px]">
              Boards
            </TabsTrigger>
            <TabsTrigger value="chatlog" className="h-9 w-full sm:w-[130px]">
              Chat/voice logs
            </TabsTrigger>
            <TabsTrigger value="leads" className="h-9 w-full sm:w-[130px]">
              Leads
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
            <DateRangePicker
              key={dateRange?.from?.toISOString() ?? "default"}
              onUpdate={({ range }) => setDateRange(range)}
              className="w-full sm:w-auto"
              align="start"
              showCompare={false}
              initialDateFrom={dateRange?.from}
              initialDateTo={dateRange?.to}
            />
            <div className="text-secondaryText py-2.5 px-3 border border-input bg-white truncate w-full sm:w-[300px] rounded-lg max-h-[40px] flex items-center justify-center">
              <Search className="h-4 w-4 mr-2" />
              <input
                placeholder="Type a command or search..."
                onChange={(e) => {}}
                className="appearance-none border-none outline-none p-0 m-0 bg-transparent w-full focus:ring-0 text-sm leading-5"
              />
            </div>
          </div>
        </div>
        <TabsContent value="chatlog">
          <ChatLog />
        </TabsContent>
        <TabsContent value="leads">
          <Leads />
        </TabsContent>
        <TabsContent value="boards">
          <Boards />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Page;
