import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

const Timer = ({ callState, onDurationChange, className }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);

  // Format time display
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  useEffect(() => {
    if (callState === "connected") {
      // Start timer if connected and no interval is running
      if (!intervalRef.current) {
        setElapsedSeconds(0); // Reset timer on connect
        intervalRef.current = setInterval(() => {
          setElapsedSeconds((prevSeconds) => {
            const newSeconds = prevSeconds + 1;
            // Report duration change to parent if callback provided
            if (onDurationChange) {
              onDurationChange(newSeconds);
            }
            return newSeconds;
          });
        }, 1000);
      }
    } else {
      // Clear timer if not connected or call ended
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset seconds when call goes idle
      if (callState === "idle") {
        setElapsedSeconds(0);
      }
    }

    // Cleanup function to clear interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [callState]);

  // Don't render anything if call is idle
  if (callState === "idle") {
    return null;
  }

  return <h2 className={className}>{formatTime(elapsedSeconds)}</h2>;
};

Timer.propTypes = {
  callState: PropTypes.string.isRequired,
  onDurationChange: PropTypes.func,
  className: PropTypes.string,
};

export default Timer;
