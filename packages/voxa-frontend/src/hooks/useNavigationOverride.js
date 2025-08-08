import { useEffect } from "react";
import { useCallbackRef } from "@/hooks/useCallbackRef";

/**
 * Hook to override navigation behavior to ensure proper cleanup when navigating away from the playground
 *
 * @param {string} slug - The agent slug
 * @param {Function} handleHangUp - Function to handle hanging up a call
 * @param {Function} cleanupWebSocket - Function to clean up WebSocket connection
 * @param {boolean} isCalling - Whether there's an active call
 * @param {object} device - The Twilio device object
 * @param {Function} setIsCalling - Function to update calling state
 * @param {Function} setCallLoading - Function to update call loading state
 * @param {Function} setChatLoading - Function to update chat loading state
 */
export function useNavigationOverride({
  slug,
  handleHangUp,
  cleanupWebSocket,
  isCalling,
  device,
  setIsCalling,
  setCallLoading,
  setChatLoading,
}) {
  // Create stable cleanup callback with useCallbackRef
  const cleanupCallback = useCallbackRef((num) => {
    console.log("cleanup callback is called", num);
    // // Clean up any pending operations
    // if (isCalling) {
    //   // Call handleHangUp which takes care of WebSocket and call disconnect
    //   handleHangUp();
    // } else {
    //   // Still need to clean up WebSocket even if not in a call
    //   cleanupWebSocket();
    // }

    // // Destroy the Twilio device if it exists
    // if (device) {
    //   try {
    //     device.disconnectAll();
    //     device.destroy();
    //   } catch (error) {
    //     console.error("Error cleaning up Twilio device:", error);
    //   }
    // }

    // // Abort any pending operations
    // try {
    //   const abortController = new AbortController();
    //   abortController.abort();
    // } catch (error) {
    //   console.error("Error aborting pending operations:", error);
    // }

    // // Reset state (this is a best effort since component might be unmounting)
    // try {
    //   setIsCalling(false);
    //   setCallLoading(false);
    //   setChatLoading(false);
    // } catch (error) {
    //   console.error("Error resetting state during cleanup:", error);
    // }
    return;
  });

  // Override the browser's navigation behavior
  useEffect(() => {
    // Store original navigation functions
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // Helper function to determine if a navigation should trigger a reload
    const shouldReloadOnNavigation = (url) => {
      // Parse the URL to get the path
      const urlObj = new URL(url, window.location.origin);
      const path = urlObj.pathname;

      // Check if navigating away from playground
      if (path && !path.includes(`/agent/${slug}/playground`)) {
        return true;
      }
      return false;
    };

    // Override pushState
    window.history.pushState = function () {
      // Check if we should force reload
      const url = arguments[2];
      if (url && shouldReloadOnNavigation(url)) {
        // Only run cleanup if actually navigating away from playground
        cleanupCallback(4);

        // Instead of client-side navigation, force a full page load
        window.location.href = url;
        return;
      }

      // Otherwise, proceed with normal navigation without cleanup
      return originalPushState.apply(this, arguments);
    };

    // Override replaceState
    window.history.replaceState = function () {
      // Check if we should force reload
      const url = arguments[2];
      if (url && shouldReloadOnNavigation(url)) {
        // Only run cleanup if actually navigating away from playground
        cleanupCallback(3);

        // Instead of client-side navigation, force a full page load
        window.location.href = url;
        return;
      }

      // Otherwise, proceed with normal navigation without cleanup
      return originalReplaceState.apply(this, arguments);
    };

    // Handle popstate (back/forward button)
    const handlePopState = () => {
      // Check if we're leaving the playground page
      const currentPath = window.location.pathname;
      if (!currentPath.includes(`/agent/${slug}/playground`)) {
        // Only clean up if actually leaving the playground
        cleanupCallback(2);

        // If we've navigated away from playground using browser back button,
        // force a full page reload to ensure the new page loads properly
        window.location.reload();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      // Restore original navigation functions
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;

      // Remove event listener
      window.removeEventListener("popstate", handlePopState);
    };
  }, [slug, cleanupCallback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all resources
      cleanupCallback(1);

      // No need to handle device cleanup here, as it's handled in the component
    };
  }, [cleanupCallback]);

  return cleanupCallback;
}
