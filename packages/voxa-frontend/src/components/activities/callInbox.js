import { useEffect, useRef, useCallback } from "react";
import { getDateAndTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AArrowDown,
  ArrowDownLeft,
  ChevronDown,
  Voicemail,
} from "lucide-react";
import { useActivities } from "@/context/ActivitiesContext";

// Add new Skeleton component
const ActivitySkeleton = () => (
  <div className="flex flex-col p-3 animate-pulse">
    <div className="flex justify-between w-full">
      <div className="flex gap-2 items-center">
        <div className="h-4 w-4 rounded-full bg-gray-200"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
      <div className="h-4 w-16 bg-gray-200 rounded"></div>
    </div>
    <div className="flex justify-between w-full mt-2">
      <div className="h-4 w-32 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const CallInbox = ({
  activities,
  selectedActivity,
  setSelectedActivity,
  loadMore,
  isFetchingData,
}) => {
  const observer = useRef();
  const {
    ticketStatusInChatLogs,
    setTicketStatusInChatLogs,
    ACTIVITY_COLUMNS,
  } = useActivities();
  console.log(isFetchingData, "testing00000");
  const lastActivityRef = useCallback(
    (node) => {
      if (isFetchingData) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isFetchingData, loadMore]
  );

  console.log(activities, "testing00000");

  return (
    <div className="flex flex-col py-3 h-full overflow-hidden">
      <div className="font-bold font-sans leading-6 border-border border-b px-4 pb-[11px]">
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none border text-sm font-medium leading-5 border-input py-2 px-3 flex justify-between items-center min-w-[110px] min-h-10 rounded-md hover:bg-secondary">
            {ACTIVITY_COLUMNS[ticketStatusInChatLogs].title}{" "}
            <ChevronDown className="h-4 text-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="-mt-2 w-[110px]">
            {Object.values(ACTIVITY_COLUMNS).map((column) => (
              <DropdownMenuItem
                key={column.id}
                onClick={() => setTicketStatusInChatLogs(column.id)}
              >
                {column.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-col gap-0.5 p-1.5 overflow-y-auto flex-1 max-h-[calc(100vh-9em-80px)] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar-thumb]:!bg-[#d1d5db] [&::-webkit-scrollbar-thumb]:rounded-full">
        {isFetchingData && (
          <>
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
          </>
        )}
        {!isFetchingData && (!activities || activities.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-inbox text-gray-400 mb-3"
            >
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            <p className="text-md font-medium text-gray-600">
              No activities yet
            </p>
            <p className="text-sm text-gray-400">
              Your new activities will appear here.
            </p>
          </div>
        )}
        {!isFetchingData &&
          activities &&
          activities.length > 0 &&
          activities.map((activity, index) => {
            const isLastElement = index === activities.length - 1;
            const { date, time } = getDateAndTime(activity?.updatedAt);
            const contact = activity.contact || {};

            const timeAgo = () => {
              const now = new Date();
              const createdAt = new Date(activity?.createdAt);
              const diffInMinutes = Math.floor((now - createdAt) / (1000 * 60));

              if (diffInMinutes < 1) return "just now";
              if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

              const diffInHours = Math.floor(diffInMinutes / 60);
              if (diffInHours < 24) return `${diffInHours}h ago`;

              const diffInDays = Math.floor(diffInHours / 24);
              if (diffInDays < 7) return `${diffInDays}d ago`;

              return date; // Fall back to the date if more than a week old
            };

            return (
              <div
                ref={isLastElement ? lastActivityRef : null}
                key={index}
                className={`flex flex-col p-3 hover:cursor-pointer rounded-lg
                ${selectedActivity?._id === activity._id && "bg-[#F1F5F9]"}
              `}
                onClick={() => setSelectedActivity(activity)}
              >
                <div className="flex justify-between w-full">
                  <div className="flex gap-2 items-center text-neutral-800 font-sans font-medium text-sm leading-6">
                    <h6 className="flex justify-center items-center h-4 w-4 rounded-full bg-[#E2E8F0] text-[#64748B] tracking-tighter font-medium text-[8px] font-sans leading-[8px] uppercase">
                      {contact.firstName?.[0] || "?"}{" "}
                      {contact.lastName?.[0] || "?"}
                    </h6>
                    <h6 className="text-sm font-sans leading-5 text-foreground">
                      {contact.firstName || "Unknown"} {contact.lastName || ""}
                    </h6>
                  </div>
                  <span className="font-sans text-sm text-neutral-400 leading-6">
                    {timeAgo()}
                  </span>
                </div>
                <div className="flex justify-between w-full gap-1 text-neutral-500">
                  <div className="flex items-center gap-2 text-sm leading-6">
                    {activity?.conversationMode === "call" && (
                      <ArrowDownLeft className="h-[18px] w-[18px] text-neutral-400" />
                    )}
                    {(() => {
                      const mode =
                        activity?.conversationMode === "call" ? "Call" : "Chat";
                      const source = activity?.source;
                      const status = activity?.status;

                      let sourceText = "";
                      switch (source) {
                        case "widget":
                          sourceText = "Widget";
                          break;
                        case "api":
                          sourceText = "via API";
                          break;
                        case "playground":
                        default:
                          sourceText = "Playground";
                      }

                      if (status === "completed") {
                        return mode === "Call"
                          ? `${sourceText} Call Ended`
                          : `${sourceText} ${mode} Completed`;
                      }

                      return `${sourceText} ${mode}${
                        status === "in-progress" ? " (In-Progress)" : ""
                      }`;
                    })()}
                  </div>
                  {activity?.conversationMode === "call" && (
                    <Voicemail className="h-[18px] w-[18px] text-neutral-400" />
                  )}
                </div>
              </div>
            );
          })}

        {isFetchingData && activities.length > 0 && (
          <>
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
          </>
        )}
      </div>
    </div>
  );
};

export default CallInbox;
