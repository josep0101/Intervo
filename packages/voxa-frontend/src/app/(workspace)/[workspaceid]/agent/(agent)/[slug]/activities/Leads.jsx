"use client";
import DataTable from "@/components/activities/LeadsTable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { generateCsv, download, mkConfig } from "export-to-csv";
import { useActivities } from "@/context/ActivitiesContext";
import { Skeleton } from "@/components/ui/skeleton";

// Define the Skeleton component for the Leads page
const LeadsPageSkeleton = () => (
  <div className="h-auto lg:max-h-[calc(100vh-4em)] bg-white rounded-[8px] shadow-md border border-[#DDD] animate-pulse">
    <div className="h-16 py-3 px-7 flex justify-between items-center border-b border-border">
      <Skeleton className="h-6 w-20 rounded" /> {/* "Leads" title */}
      <Skeleton className="h-9 w-28 rounded" /> {/* Export button */}
    </div>
    <div className="py-3 px-4 space-y-3">
      {/* Simplified table skeleton: header row + a few data rows */}
      <div className="flex space-x-2">
        {" "}
        {/* Header */}
        <Skeleton className="h-8 flex-1 rounded" />
        <Skeleton className="h-8 flex-1 rounded" />
        <Skeleton className="h-8 flex-1 rounded" />
        <Skeleton className="h-8 flex-1 rounded" />
      </div>
      {[...Array(5)].map((_, i /* Data rows */) => (
        <div key={i} className="flex space-x-2">
          <Skeleton className="h-10 flex-1 rounded" />
          <Skeleton className="h-10 flex-1 rounded" />
          <Skeleton className="h-10 flex-1 rounded" />
          <Skeleton className="h-10 flex-1 rounded" />
        </div>
      ))}
      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center pt-4">
        <Skeleton className="h-5 w-1/3 rounded" />
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-20 rounded" />
          <Skeleton className="h-9 w-20 rounded" />
        </div>
      </div>
    </div>
  </div>
);

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const { fetchLeads } = useActivities();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getLeads = async () => {
      setIsLoading(true);
      try {
        const data = await fetchLeads(page);
        setLeads(data);
      } catch (error) {
        console.error("Error fetching leads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getLeads();
  }, [page, fetchLeads]);

  const csvConfig = mkConfig({ useKeysAsHeaders: true });

  const exportToCSV = () => {
    const csv = generateCsv(csvConfig)(leads?.contacts || []);
    download(csvConfig)(csv);
  };

  if (isLoading) {
    return <LeadsPageSkeleton />;
  }

  return (
    <div className="h-auto lg:max-h-[calc(100vh-4em)] bg-white rounded-[8px] shadow-md border border-[#DDD]">
      <div className="h-16 py-3 px-7 flex justify-between items-center border-b border-border">
        <span className="text-sm leading-6 font-medium font-sans">Leads</span>
        <Button
          onClick={() => exportToCSV()}
          className="bg-white border-[#E2E8F0] hover:bg-black/[0.3] text-primary"
        >
          Export <Download />
        </Button>
      </div>
      <div className="py-3 px-4">
        <DataTable
          data={leads}
          pagination={leads?.pagination}
          page={page}
          setPage={setPage}
        />
      </div>
    </div>
  );
};

export default Leads;
