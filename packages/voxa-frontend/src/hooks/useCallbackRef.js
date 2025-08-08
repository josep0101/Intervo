import { useCallback, useRef } from "react";

/**
 * Hook that creates a stable callback reference that can be safely used in useEffect dependencies
 * This is useful when you need a callback that captures the latest props/state
 * without causing effect hooks to re-run unnecessarily
 *
 * @param {Function} callback - Function to create a stable reference for
 * @returns {Function} A stable callback reference
 */
export function useCallbackRef(callback) {
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  callbackRef.current = callback;

  // Return a stable function that always calls the latest callback
  return useCallback((...args) => {
    return callbackRef.current?.(...args);
  }, []);
}
