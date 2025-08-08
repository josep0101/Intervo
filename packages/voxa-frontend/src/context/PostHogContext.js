"use client";
import { createContext, useContext, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { useAuth } from "./AuthContext";

const PostHogContext = createContext();

export function PostHogProvider({ children }) {
  const posthog = usePostHog();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && user.id && posthog) {
      // Identify the user with PostHog
      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
        // Add any other user properties you want to track
        createdAt: user.createdAt,
        isAdmin: user.isAdmin,
      });

      console.log("PostHog user identified:", user.id);
    } else if (isAuthenticated === false && posthog) {
      // Reset PostHog when user logs out
      posthog.reset();
      console.log("PostHog user reset");
    }
  }, [isAuthenticated, user, posthog]);

  // Helper function to capture events with user context
  const captureEvent = (eventName, properties = {}) => {
    if (posthog) {
      posthog.capture(eventName, {
        ...properties,
        // Add user context to all events
        ...(user && {
          userId: user.id,
          userEmail: user.email,
        }),
      });
    }
  };

  // Helper function to set user properties
  const setUserProperties = (properties) => {
    if (posthog && user) {
      posthog.setPersonProperties(properties);
    }
  };

  const value = {
    posthog,
    captureEvent,
    setUserProperties,
  };

  return (
    <PostHogContext.Provider value={value}>{children}</PostHogContext.Provider>
  );
}

export function usePostHogTracking() {
  const context = useContext(PostHogContext);
  if (!context) {
    throw new Error("usePostHogTracking must be used within a PostHogProvider");
  }
  return context;
}
