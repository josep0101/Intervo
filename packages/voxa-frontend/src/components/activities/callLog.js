import { ChatMessageList } from "../ui/chat/chat-message-list";
import { ChatBubble, ChatBubbleMessage } from "../ui/chat/chat-bubble";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipsis, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities } from "@/context/ActivitiesContext";

const CallLog = ({ selectedActivity, isFetchingData }) => {
  const { updateActivityTicketStatus, deleteActivity } = useActivities();
  const contact = selectedActivity?.contact || {};

  const displayDateTime = (data) => {
    const date = new Date(data);
    const formattedDate = date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
      timeZone: "UTC",
    });
    return formattedDate;
  };

  const conversationTranscription = [
    {
      isAI: true,
      user: "AI",
      message: "Hello, how can I help you today?",
      date: "12:00 PM",
    },
    {
      isAI: false,
      user: "User",
      message: "I need help with my account.",
      date: "12:01 PM",
    },
    {
      isAI: true,
      user: "AI",
      message: "I'm sorry, I can't help with that.",
      date: "12:02 PM",
    },
    {
      isAI: false,
      user: "User",
      message: "Can you help me with my account?",
      date: "12:03 PM",
    },
  ];

  console.log(selectedActivity, "selectedActivity");

  const SkeletonLoader = () => (
    <>
      <div className="py-3 px-7 flex border-border border-b items-center justify-between h-16">
        <div className="flex gap-3 items-center">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>

      <div className="w-full mx-auto h-[calc(100vh-13.1rem)]">
        <ChatMessageList>
          <div className="p-4 space-y-6">
            <ChatBubble variant="received">
              <Skeleton className="h-24 w-[500px]" />
            </ChatBubble>
            <div className="flex justify-end">
              <ChatBubble variant="sent">
                <Skeleton className="h-16 w-[400px]" />
              </ChatBubble>
            </div>
            <ChatBubble variant="received">
              <Skeleton className="h-20 w-[450px]" />
            </ChatBubble>
          </div>
        </ChatMessageList>
      </div>
    </>
  );

  if (isFetchingData) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div className="py-3 px-7 flex border-border border-b items-center justify-between h-16">
        <div className="flex gap-3 items-center">
          <h6 className="flex justify-center items-center h-8 w-8 rounded-full bg-[#E2E8F0] text-[#64748B] tracking-tighter font-medium text-sm font-sans leading-[8px] uppercase">
            {contact.firstName?.[0] || "?"} {contact.lastName?.[0] || "?"}
          </h6>
          <h6 className="text-sm font-sans leading-6 font-medium text-neutral-800">
            {contact.firstName || "Unknown"} {contact.lastName || ""}
          </h6>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="h-7 w-7 rounded-full border border-border flex items-center justify-center">
                <Ellipsis className="size-4" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mr-44 w-[224px]">
              {(() => {
                console.log(selectedActivity, "selectedActivity");
                const currentStatus = selectedActivity?.ticketStatus;
                const activityId = selectedActivity?._id;
                const items = [];

                if (!activityId) return null;

                if (currentStatus === "open") {
                  items.push(
                    <DropdownMenuItem
                      key="in-progress"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "in-progress")
                      }
                    >
                      Move to In Progress
                    </DropdownMenuItem>
                  );
                  items.push(
                    <DropdownMenuItem
                      key="closed"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "closed")
                      }
                    >
                      Move to Closed
                    </DropdownMenuItem>
                  );
                  items.push(
                    <DropdownMenuItem
                      key="archive"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "archived")
                      }
                    >
                      Move to Archive
                    </DropdownMenuItem>
                  );
                } else if (currentStatus === "in-progress") {
                  items.push(
                    <DropdownMenuItem
                      key="open"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "open")
                      }
                    >
                      Move to Open
                    </DropdownMenuItem>
                  );
                  items.push(
                    <DropdownMenuItem
                      key="closed"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "closed")
                      }
                    >
                      Move to Closed
                    </DropdownMenuItem>
                  );
                  items.push(
                    <DropdownMenuItem
                      key="archive"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "archived")
                      }
                    >
                      Move to Archive
                    </DropdownMenuItem>
                  );
                } else if (currentStatus === "closed") {
                  items.push(
                    <DropdownMenuItem
                      key="reopen"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "open")
                      }
                    >
                      Reopen
                    </DropdownMenuItem>
                  );
                  items.push(
                    <DropdownMenuItem
                      key="archive"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "archived")
                      }
                    >
                      Move to Archive
                    </DropdownMenuItem>
                  );
                } else if (currentStatus === "archived") {
                  items.push(
                    <DropdownMenuItem
                      key="open"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "open")
                      }
                    >
                      Move to Open
                    </DropdownMenuItem>
                  );
                  items.push(
                    <DropdownMenuItem
                      key="in-progress"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "in-progress")
                      }
                    >
                      Move to In Progress
                    </DropdownMenuItem>
                  );
                  items.push(
                    <DropdownMenuItem
                      key="closed"
                      onClick={() =>
                        updateActivityTicketStatus(activityId, "closed")
                      }
                    >
                      Move to Closed
                    </DropdownMenuItem>
                  );
                }
                return items;
              })()}
              <DropdownMenuItem
                className="text-red-500"
                onClick={() => {
                  console.log(selectedActivity, "selectedActivityBeforeDelete");
                  selectedActivity?._id && deleteActivity(selectedActivity);
                }}
              >
                <Trash2 className="size-4 mr-2" />
                Delete{" "}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="w-full mx-auto h-[calc(100vh-13.1rem)]">
        <ChatMessageList className="overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {selectedActivity?.conversationTranscription?.length > 0 ? (
            selectedActivity.conversationTranscription.map((message, index) => (
              <ChatBubble
                key={index}
                variant={message.speaker === "agent" ? "received" : "sent"}
              >
                <ChatBubbleMessage
                  className={`text-sm font-geist leading-5 ${
                    message.speaker === "agent" ? "bg-gray-100" : "bg-gray-800"
                  }`}
                >
                  {message.text}
                  {message.speaker === "agent" && message.confidence && (
                    <div className="absolute -bottom-2 text-xs leading-4 font-semibold bg-purple-200 px-2.5 py-0.5 rounded-full">
                      {message.confidence}
                    </div>
                  )}
                </ChatBubbleMessage>
              </ChatBubble>
            ))
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  No conversation transcript available
                </p>
                <p className="text-xs text-muted-foreground/60">
                  This call may not have been transcribed or the transcript is
                  still processing
                </p>
              </div>
            </div>
          )}
        </ChatMessageList>
      </div>
    </div>
  );
};

export default CallLog;
