import CallInbox from "@/components/activities/callInbox";
import CallLog from "@/components/activities/callLog";
import CallSummary from "@/components/activities/callSummary";
import { useActivities } from "@/context/ActivitiesContext";
import Fuse from "fuse.js";
import React, { useEffect, useState } from "react";

const ChatLog = () => {
  const { contacts, activities, fetchData, isFetchingData, loadMore } =
    useActivities();

  //There is only activities, contact is part of the activities Object
  const [items, setItems] = useState(activities);
  const [selectedActivity, setSelectedActivity] = useState(
    activities[0] || null
  );
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setItems(activities);
    setSelectedActivity(activities[0] || null);
  }, [isFetchingData, activities]);

  const fuseOptions = {
    keys: ["firstName", "lastName", "phoneNumber"],
  };

  const handleFilterStatusChange = (status) => {
    if (status === "All") {
      setItems(activities);
      return;
    }

    if (status === "Completed") {
      setItems(activities.filter((item) => item.status === "Completed"));
    } else {
      setItems(activities.filter((item) => item.status === "Incomplete"));
    }
  };

  const handleSearchInputChange = (searchTerm) => {
    if (searchTerm === "") {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const fuse = new Fuse(items, fuseOptions);
    const results = fuse.search(searchTerm);
    setItems(results.map((entry) => entry.item));
    console.log(items);
  };

  return (
    <div className="h-auto lg:max-h-[calc(100vh-9em)] bg-white rounded-[8px] shadow-md border border-[#DDD]">
      <div className="grid grid-cols-1 lg:grid-cols-12 font-inter w-full h-full gap-4 lg:gap-0">
        <div
          className="col-span-1 lg:col-span-3 lg:border-r border-border overflow-hidden"
          style={{ height: "calc(100vh - 9em)" }}
        >
          <CallInbox
            activities={items}
            selectedActivity={selectedActivity}
            setSelectedActivity={setSelectedActivity}
            loadMore={loadMore}
            isFetchingData={isFetchingData}
          />
        </div>
        <div className="col-span-1 lg:col-span-5 lg:border-r border-border h-full">
          <CallLog
            isFetchingData={isFetchingData}
            user={selectedActivity}
            selectedActivity={selectedActivity}
          />
        </div>
        <div className="col-span-1 lg:col-span-4 h-full">
          <CallSummary
            user={selectedActivity}
            selectedActivity={selectedActivity}
            isFetchingData={isFetchingData}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatLog;
