"use client";
import { PostHogProvider as PHProvider } from "posthog-js/react";

export function PostHogProvider({ children }) {
  if (typeof window === "undefined") {
    return children;
  }

  return (
    <PHProvider
      apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: "/ingest",
        ui_host: "https://us.posthog.com",
        capture_pageview: "history_change",
        capture_pageleave: true,
        capture_exceptions: true,
        debug: process.env.NODE_ENV === "development",
      }}
    >
      {children}
    </PHProvider>
  );
}
