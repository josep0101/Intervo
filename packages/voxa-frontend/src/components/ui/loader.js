"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Loader({ className, size = 24 }) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", className)}
      size={size}
    />
  );
}
