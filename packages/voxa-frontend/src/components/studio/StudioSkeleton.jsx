import React from "react";
import { Skeleton } from "../ui/skeleton";

const StudioSkeleton = () => {
  return (
    <div className="z-0 md:max-w-[305px] w-full h-[156px] p-4 border border-zinc-200 shadow-sm rounded-md bg-white flex flex-col hover:cursor-pointer">
      <div className="flex gap-3">
        <Skeleton className="rounded-full h-10 w-10" />
        <div className="flex flex-col text-zinc-950 gap-2 mt-1">
          <Skeleton className="w-[60px] h-3" />
          <Skeleton className="w-[160px] h-3" />
        </div>
      </div>
      <div className="flex flex-col justify-between h-full mt-2 gap-4">
        <Skeleton className="w-full h-full" />
      </div>
    </div>
  );
};

export default StudioSkeleton;
