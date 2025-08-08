import { Ellipsis, Trash, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Dialog, DialogClose, DialogContent } from "../ui/dialog";
import { useState } from "react";
import CallLog from "./callLog";
import CallSummary from "./callSummary";
import { VisuallyHidden } from "@nextui-org/react";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useActivities } from "@/context/ActivitiesContext";

const BoardCard = ({ selectedActivity }) => {
  const [open, setOpen] = useState(false);
  const { deleteActivity } = useActivities();

  if (!selectedActivity) return null;

  const fullName =
    `${selectedActivity.contact?.firstName || ""} ${
      selectedActivity.contact?.lastName || ""
    }`.trim() ||
    (selectedActivity.source === "voxa.ai"
      ? "Playground Conversation"
      : "Unknown");

  const DropDown = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="border border-border rounded-full h-7 w-7 flex justify-center items-center hover:cursor-pointer">
          <Ellipsis className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-1 mr-[9.5rem] w-[204px]">
          <DropdownMenuItem>More Info</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive hover:!bg-destructive hover:!text-white"
            onClick={(event) => {
              event.stopPropagation();
              if (selectedActivity?._id) {
                deleteActivity(selectedActivity);
              }
            }}
          >
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="z-0 w-full h-[140px] p-4 border border-zinc-200 shadow-sm gap-2 rounded-md bg-white flex flex-col hover:cursor-pointer"
      >
        <div className="flex justify-between">
          <p className="font-medium">{fullName}</p>
          <DropDown />
        </div>
        <div className="text-sm leading-6 text-[#5A5A65]">
          <p>{selectedActivity.contact?.phoneNumber}</p>
          <p>{selectedActivity.contact?.email}</p>
        </div>
        <div className="rounded-sm px-1 py-0.5 text-xs leading-4 bg-emerald-200 mr-auto font-inter">
          {selectedActivity.conversationMode.charAt(0).toUpperCase() +
            selectedActivity.conversationMode.slice(1)}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="min-w-[952px] max-h-[calc(100vh-10rem)] overflow-hidden p-0">
          <DialogClose className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </DialogClose>
          <VisuallyHidden>
            <DialogTitle></DialogTitle>
          </VisuallyHidden>
          <div className="grid grid-cols-9 w-full">
            <div className="col-span-5 border-r border-border">
              <CallLog
                user={selectedActivity}
                selectedActivity={selectedActivity}
              />
            </div>
            <div className="col-span-4">
              <CallSummary selectedActivity={selectedActivity} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoardCard;
