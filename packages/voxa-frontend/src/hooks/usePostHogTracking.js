"use client";
import { usePostHogTracking } from "@/context/PostHogContext";

export function usePostHogEvents() {
  const { captureEvent, setUserProperties } = usePostHogTracking();

  // Common event tracking functions
  const trackAgentCreated = (agentData) => {
    captureEvent("agent_created", {
      agentId: agentData.id,
      agentName: agentData.name,
      agentType: agentData.type,
    });
  };

  const trackAgentPublished = (agentData) => {
    captureEvent("agent_published", {
      agentId: agentData.id,
      agentName: agentData.name,
    });
  };

  const trackPageView = (pageName, properties = {}) => {
    captureEvent("page_viewed", {
      page: pageName,
      ...properties,
    });
  };

  const trackUserAction = (action, properties = {}) => {
    captureEvent("user_action", {
      action,
      ...properties,
    });
  };

  const trackOnboardingStep = (step, completed = false) => {
    captureEvent("onboarding_step", {
      step,
      completed,
      timestamp: new Date().toISOString(),
    });
  };

  const updateUserProperties = (properties) => {
    setUserProperties(properties);
  };

  return {
    trackAgentCreated,
    trackAgentPublished,
    trackPageView,
    trackUserAction,
    trackOnboardingStep,
    updateUserProperties,
    captureEvent, // Raw event capture function
  };
}
