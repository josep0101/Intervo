"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import returnAPIUrl from "@/config/config";
import { useToast } from "../hooks/use-toast";

const backendAPIUrl = returnAPIUrl();

// Add the columns configuration
export const ACTIVITY_COLUMNS = {
  open: {
    id: "open",
    title: "Open",
    bgColor: "bg-zinc-200",
    items: [],
  },
  "in-progress": {
    id: "in-progress",
    title: "In Progress",
    bgColor: "bg-purple-200",
    items: [],
  },
  closed: {
    id: "closed",
    title: "Closed",
    bgColor: "bg-rose-200",
    items: [],
  },
  archived: {
    id: "archived",
    title: "Archived",
    bgColor: "bg-zinc-400",
    items: [],
  },
};

const ActivitiesContext = createContext();

export function ActivitiesProvider({ children }) {
  const { toast } = useToast();
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [ticketActivities, setTicketActivities] = useState(
    Object.keys(ACTIVITY_COLUMNS).reduce((acc, key) => {
      acc[key] = { activities: [], pagination: {} };
      return acc;
    }, {})
  );
  const [dateRange, setDateRange] = useState(null);
  const [ticketStatusInChatLogs, setTicketStatusInChatLogs] = useState("open"); // default to "open"
  const [activeTab, setActiveTab] = useState("boards"); // default to "boards" tab

  // Add page tracking for each status
  const [pages, setPages] = useState({
    open: 1,
    "in-progress": 1,
    closed: 1,
    archived: 1,
  });

  // Add loading states for each status
  const [isLoadingMore, setIsLoadingMore] = useState({
    open: false,
    "in-progress": false,
    closed: false,
    archived: false,
  });

  const ITEMS_PER_PAGE = 10; // You can adjust this constant as needed

  const fetchData = async () => {
    setIsFetchingData(true);
    try {
      // Reset activities pagination
      setPage(1);
      setHasMore(true);

      // Choose fetch strategy based on activeTab
      let fetchSuccessful = false;
      switch (activeTab) {
        case "chatlog":
          fetchSuccessful = await fetchActivities(1, true);
          break;
        case "boards":
          await fetchActivitiesByStatus();
          fetchSuccessful = true;
          break;
        // Add other cases as needed
      }

      // Only set isFetchingData to false if we actually completed the fetch
      if (fetchSuccessful) {
        setIsFetchingData(false);
      }
    } catch (error) {
      console.error(error);
      setIsFetchingData(false);
    }
  };

  const fetchActivities = async (pageNum, reset = false) => {
    if (!dateRange?.from || !dateRange?.to) {
      console.log("Date range not set yet, skipping fetch");
      return false;
    }

    // Get agentId from URL path
    const pathParts = window.location.pathname.split("/");
    const agentId = pathParts[3];

    if (!agentId) {
      throw new Error("Agent ID is required but not found in URL path");
    }

    const fromDate = dateRange.from.toISOString();
    const toDate = dateRange.to.toISOString();
    const url = `${backendAPIUrl}/activities?page=${pageNum}&limit=${ITEMS_PER_PAGE}&agentId=${agentId}&from=${fromDate}&to=${toDate}&ticketStatus=${ticketStatusInChatLogs}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const data = await response.json();

    // Set hasMore based on the number of activities received
    const hasMoreActivities = data.activities.length === ITEMS_PER_PAGE;
    setHasMore(hasMoreActivities);

    if (data.activities.length === 0) {
      setHasMore(false);
      return false; // Return false to indicate fetch wasn't completed
    }

    setActivities((prev) =>
      reset ? data.activities : [...prev, ...data.activities]
    );
    setPage(pageNum);
    return true; // Return true to indicate successful fetch
  };

  const loadMore = async () => {
    if (!hasMore || isFetchingData) {
      console.log("Skipping loadMore:", { hasMore, isFetchingData });
      return;
    }

    setIsFetchingData(true);
    try {
      await fetchActivities(page + 1);
    } finally {
      setIsFetchingData(false);
    }
  };

  const fetchLeads = async (page) => {
    const response = await fetch(
      `${backendAPIUrl}/contacts/leads?page=${page}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const leads = await response.json();
    return leads;
  };

  const loadMoreByStatus = async (status) => {
    if (isLoadingMore[status]) return;

    try {
      setIsLoadingMore((prev) => ({ ...prev, [status]: true }));

      const pathParts = window.location.pathname.split("/");
      const agentId = pathParts[3];
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      const url = `${backendAPIUrl}/activities/by-ticket-status?agentId=${agentId}&limit=10&from=${fromDate}&to=${toDate}&page=${
        pages[status] + 1
      }&ticketStatus=${status}`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const data = await response.json();

      setTicketActivities((prev) => ({
        ...prev,
        [status]: {
          ...prev[status],
          activities: [...prev[status].activities, ...data.activities],
          pagination: data.pagination,
        },
      }));

      setPages((prev) => ({
        ...prev,
        [status]: prev[status] + 1,
      }));
    } catch (error) {
      console.error("Error loading more activities:", error);
    } finally {
      setIsLoadingMore((prev) => ({ ...prev, [status]: false }));
    }
  };

  const fetchActivitiesByStatus = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      console.log("Date range not set yet, skipping fetch");
      return;
    }

    try {
      const pathParts = window.location.pathname.split("/");
      const agentId = pathParts[3];

      if (!agentId) {
        throw new Error("Agent ID is required but not found in URL path");
      }

      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      const url = `${backendAPIUrl}/activities/by-ticket-status?agentId=${agentId}&limit=10&from=${fromDate}&to=${toDate}&page=1`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const data = await response.json();
      setTicketActivities(data);

      // Reset all pages to 1 on initial load
      setPages({
        open: 1,
        "in-progress": 1,
        closed: 1,
        archived: 1,
      });
    } catch (error) {
      console.error("Error fetching activities by status:", error);
    }
  };

  const updateActivityTicketStatus = async (activityId, ticketStatus) => {
    try {
      const response = await fetch(
        `${backendAPIUrl}/activities/${activityId}/ticket-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ ticketStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      // Refresh the activities list after successful update
      await fetchActivitiesByStatus();
      toast({
        title: "Success",
        description: "Ticket status updated successfully.",
      });
      return true;
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket status.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteActivity = async (activity) => {
    const activityId = activity._id;
    const agentId = activity.agentId;
    try {
      const response = await fetch(
        `${backendAPIUrl}/activities/${activityId}?agentId=${agentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      // Refresh the activities list after successful deletion
      await fetchActivitiesByStatus();
      toast({
        title: "Success",
        description: "Activity deleted successfully.",
      });
      // Optionally, you might want to clear the selectedActivity if it was the one deleted
      // setSelectedActivity(null); // or some other logic to handle UI post-deletion

      return true;
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        title: "Error",
        description: "Failed to delete activity.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Add useEffect to watch for ticketStatus changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setIsFetchingData(true);
      setPage(1); // Reset to first page
      setHasMore(true); // Reset hasMore
      setActivities([]); // Clear current activities
      fetchActivities(1, true) // Fetch with reset=true to clear previous activities
        .finally(() => setIsFetchingData(false));
    }
  }, [ticketStatusInChatLogs]);

  // Handle date range changes
  const handleDateRangeChange = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsFetchingData(true);
    try {
      switch (activeTab) {
        case "chatlog":
          setPage(1);
          setHasMore(true);
          setActivities([]);
          await fetchActivities(1, true);
          break;
        case "boards":
          await fetchActivitiesByStatus();
          break;
        case "leads":
          // Future implementation for leads
          break;
      }
    } finally {
      setIsFetchingData(false);
    }
  };

  useEffect(() => {
    handleDateRangeChange();
  }, [dateRange]);

  // Function to get the audio stream URL
  const getAudioUrl = (activityId) => {
    if (!activityId) return null;
    return `${backendAPIUrl}/activities/audio/${activityId}`;
  };

  const value = {
    contacts,
    activities,
    fetchData,
    fetchLeads,
    isFetchingData,
    hasMore,
    loadMore,
    ticketActivities,
    fetchActivitiesByStatus,
    updateActivityTicketStatus,
    deleteActivity,
    dateRange,
    setDateRange,
    ACTIVITY_COLUMNS,
    ticketStatusInChatLogs,
    setTicketStatusInChatLogs,
    activeTab,
    setActiveTab,
    loadMoreByStatus,
    isLoadingMore,
    getAudioUrl,
  };

  return (
    <ActivitiesContext.Provider value={value}>
      {children}
    </ActivitiesContext.Provider>
  );
}

export function useActivities() {
  return useContext(ActivitiesContext);
}
