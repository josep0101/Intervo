import { useState, useCallback, useRef, useEffect } from "react";

const useFakeProgress = () => {
  const [progressValue, setProgressValue] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState("");
  const intervalRef = useRef(null);

  const stopProgress = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    setProgressValue(0); // Reset progress value
    // setMessage(""); // Optionally clear message or let it persist until next start
  }, []);

  const startProgress = useCallback(
    (durationMs, progressMessage) => {
      stopProgress(); // Clear any existing progress

      setMessage(progressMessage);
      setIsActive(true);
      setProgressValue(0);

      const updateIntervalMs = 250; // Update 4 times a second
      const totalSteps = durationMs / updateIntervalMs;
      let currentStep = 0;

      intervalRef.current = setInterval(() => {
        currentStep++;
        const progress = (currentStep / totalSteps) * 100;
        setProgressValue(Math.min(progress, 100));

        if (currentStep >= totalSteps) {
          // Interval clears itself, but the progress remains at 100%
          // The calling component should call stopProgress() when the actual API call finishes.
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Optionally update message:
          // setMessage(prevMessage => prevMessage.replace("ing...", "ed."));
        }
      }, updateIntervalMs);
    },
    [stopProgress]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgress();
    };
  }, [stopProgress]);

  return {
    startProgress,
    stopProgress,
    progressValue,
    isActive,
    message,
  };
};

export default useFakeProgress;
