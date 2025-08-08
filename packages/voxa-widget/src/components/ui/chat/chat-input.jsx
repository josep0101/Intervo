import * as React from "react";
import { forwardRef } from "react";
import { Textarea } from "../textarea";
import { cn } from "../../../lib/utils";

export const ChatInput = forwardRef(({ className, ...props }, ref) => (
  <Textarea
    autoComplete="off"
    ref={ref}
    name="message"
    className={cn(
      "max-h-12 px-4 py-3 bg-gray-100 text-slate-950 !text-slate-950 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-full flex items-center h-16 resize-none border-0 focus:ring-0 focus-visible:ring-0 focus:border-0 focus-visible:border-0",
      className
    )}
    {...props}
  />
));

ChatInput.displayName = "ChatInput";
