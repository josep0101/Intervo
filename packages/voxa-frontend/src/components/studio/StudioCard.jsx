import {
  Bot,
  BookText,
  Radio,
  Signpost,
  SquarePen,
  Ellipsis,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const StudioCard = ({
  type,
  title,
  subtitle,
  description,
  status,
  editInfo,
  handleDelete,
}) => {
  const timeAgo = (timestamp) => {
    const updatedTime = new Date(timestamp);
    const currentTime = new Date();
    const diffInMs = currentTime - updatedTime;

    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      return `${diffInDays} days ago`;
    }
  };

  const getChars = () => {
    return `${parseInt(subtitle, 10).toLocaleString("en-US")} characters`;
  };

  const AgentInfo = () => (
    <div className="gap-1 flex items-center">
      {status === true ? (
        <>
          <Radio className="text-success h-[14px] w-[14px]" />
          <span className="text-xs font-medium font-sans text-headings leading-4">
            Live
          </span>
        </>
      ) : (
        <>
          <Signpost className="text-secondaryText h-[14px] w-[14px]" />
          <span className="text-xs font-medium font-sans text-secondaryText leading-4">
            Draft
          </span>
        </>
      )}
    </div>
  );

  const SourceInfo = () => (
    <div className="gap-1 flex items-center">
      <SquarePen className="text-secondaryText h-[14px] w-[14px]" />
      <span className="text-xs font-medium font-sans text-secondaryText leading-4">
        {timeAgo(status)}
      </span>
    </div>
  );

  const DropDown = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none flex justify-center items-center min-w-7 min-h-7 rounded-md hover:bg-secondary">
          <Ellipsis className="h-4 text-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-1 mr-[9.5rem] w-[204px]">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              editInfo();
            }}
          >
            Edit Info
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="hover:cursor-not-allowed">
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="text-destructive hover:!bg-destructive hover:!text-white"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div
      className="z-0 md:max-w-[305px] w-full h-[156px] p-4 border border-zinc-200 shadow-sm rounded-md bg-white flex flex-col hover:cursor-pointer"
      onClick={editInfo}
    >
      <div className="flex gap-3">
        <div className="rounded-full bg-secondary p-2">
          {type === "agent" ? (
            <Bot className="text-ring" />
          ) : (
            <BookText className="text-ring" />
          )}
        </div>
        <div className="flex flex-col text-zinc-950">
          <h4 className="text-sm font-semibold font-inter leading-[17px]">
            {title}
          </h4>
          <p
            className={`text-sm leading-5 font-sans ${
              type !== "agent" && "text-secondaryText"
            }`}
          >
            {type === "agent" ? subtitle : getChars()}
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-between h-full mt-1 gap-4">
        <p className="text-xs font-inter leading-[14px] text-zinc-500 pt-2 line-clamp-2">
          {description}
        </p>
        <div className="flex justify-between items-center">
          {type === "agent" ? <AgentInfo /> : <SourceInfo />}
          <DropDown />
        </div>
      </div>
    </div>
  );
};

export default StudioCard;
