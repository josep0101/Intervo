"use client";

import { usePathname } from "next/navigation";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isCanvasRoute = pathname.endsWith("/playground/canvas");

  return (
    <div className={`flex flex-col ${isCanvasRoute ? "" : "gap-6"}`}>
      {children}
    </div>
  );
}
