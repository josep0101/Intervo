import { useEffect } from "react";

/**
 * Hook to handle the beforeunload event, which fires when a page is about to unload
 * @param {Function} callback - Function to call when the page is about to unload
 */
export function useBeforeUnload(callback) {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const returnValue = callback();

      // Modern browsers require returnValue to be set
      if (returnValue) {
        event.preventDefault();
        event.returnValue = returnValue;
        return returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [callback]);
}
