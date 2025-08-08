import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect, useRef } from "react";
import { useActivities } from "@/context/ActivitiesContext";

// Helper function to format seconds into MM:SS
const formatTime = (totalSeconds) => {
  if (totalSeconds == null || isNaN(totalSeconds) || !isFinite(totalSeconds)) {
    return "00:00";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const CallSummary = ({ selectedActivity, isFetchingData }) => {
  const { getAudioUrl } = useActivities();
  const contact = selectedActivity?.contact || {};
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const progressBarRef = useRef(null); // Ref for the progress bar container

  console.log(selectedActivity, "selectedActivityin0");

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onplay = null;
      audioRef.current.onpause = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.oncanplay = null;
      audioRef.current.onloadedmetadata = null; // Remove listener
      audioRef.current.ontimeupdate = null; // Remove listener
      audioRef.current.onseeked = null; // <-- Remove seeked listener
      audioRef.current.src = ""; // Release source
      audioRef.current.load(); // Abort potential loading
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoadingAudio(false);
    setAudioError(null);
    setDuration(0); // Reset duration
    setCurrentTime(0); // Reset current time
  };

  useEffect(() => {
    cleanupAudio();
    return () => {
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivity?._id]);

  const handlePlayPause = async () => {
    setAudioError(null);

    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      return;
    }

    if (audioRef.current && !isPlaying) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error("Error playing audio:", err);
        setAudioError("Could not play audio.");
        cleanupAudio();
        setIsLoadingAudio(false);
        setIsPlaying(false);
      }
      return;
    }

    if (
      !audioRef.current &&
      selectedActivity?._id &&
      selectedActivity?.callRecording?.url
    ) {
      const audioUrl = getAudioUrl(selectedActivity._id);
      if (!audioUrl) {
        setAudioError("Could not get audio URL.");
        return;
      }

      setIsLoadingAudio(true);
      const newAudio = new Audio(audioUrl);
      audioRef.current = newAudio;

      newAudio.oncanplay = () => {
        console.log("Audio can play");
        setIsLoadingAudio(false);
        setDuration(newAudio.duration);
        newAudio.play().catch((err) => {
          console.error("Error auto-playing audio:", err);
          setAudioError("Could not start playback.");
          setIsLoadingAudio(false);
          setIsPlaying(false);
        });
      };

      newAudio.onplay = () => {
        console.log("Audio playing");
        setIsPlaying(true);
        setIsLoadingAudio(false);
      };

      newAudio.onpause = () => {
        console.log("Audio paused");
        setIsPlaying(false);
      };

      newAudio.onended = () => {
        console.log("Audio ended");
        setIsPlaying(false);
        setCurrentTime(duration); // Ensure progress bar goes to 100%
      };

      newAudio.onerror = (e) => {
        console.error("Audio error:", e);
        let errorMsg = "Failed to load audio.";
        if (e?.target?.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          errorMsg = "Audio format not supported.";
        } else if (e?.target?.error?.code === MediaError.MEDIA_ERR_NETWORK) {
          errorMsg = "Network error loading audio.";
        }
        setAudioError(errorMsg);
        setIsLoadingAudio(false);
        cleanupAudio();
      };

      // Add listener for duration
      newAudio.onloadedmetadata = () => {
        console.log("Audio metadata loaded, duration:", newAudio.duration);
        setDuration(newAudio.duration);
      };

      // Add listener for time updates
      const timeUpdateHandler = () => {
        // Only update time if the user is not actively seeking
        if (audioRef.current && !isNaN(audioRef.current.currentTime)) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };
      newAudio.ontimeupdate = timeUpdateHandler;

      newAudio.load();
    } else if (!selectedActivity?.callRecording?.url) {
      setAudioError("No recording available for this activity.");
    }
  };

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatDuration = (totalSeconds) => {
    if (totalSeconds == null || isNaN(totalSeconds)) {
      return "--:--";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )} min`;
  };

  const ListItem = ({ text }) => {
    return (
      <li className="text-purple-500">
        <span className="text-neutral-600">{text}</span>
      </li>
    );
  };

  const SkeletonLoader = () => (
    <div
      className="flex flex-col h-full"
      style={{ height: "calc(100vh - 9em)" }}
    >
      <Tabs defaultValue="details" className="w-full h-full flex flex-col">
        <TabsList className="inline-flex h-16 items-center text-muted-foreground w-full justify-start rounded-none border-b bg-transparent p-0 shrink-0">
          <TabsTrigger
            className="inline-flex items-center mt-auto ml-3 justify-center whitespace-nowrap py-1 text-sm ring-offset-background relative h-9 rounded-none border-b-2 border-b-primary bg-transparent px-4 pb-3 pt-2 font-semibold text-foreground shadow-none"
            value="details"
          >
            <span className="mb-4">Details</span>
          </TabsTrigger>
          <TabsTrigger
            className="inline-flex items-center mt-auto justify-center whitespace-nowrap py-1 text-sm ring-offset-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none"
            value="aiSummary"
          >
            <span className="mb-4">AI Summary</span>
          </TabsTrigger>
        </TabsList>

        <div className="border-border flex justify-between items-center h-[72px] border-b py-2 px-6">
          <div className="flex gap-3 items-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col py-4 px-6 border-border border-b text-sm leading-6 font-sans space-y-4">
          {["Email address", "Phone", "Country", "Tag", "Source"].map(
            (item) => (
              <div key={item} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-[250px]" />
              </div>
            )
          )}
        </div>

        <div className="flex flex-col py-4 px-6 border-border border-b text-sm leading-6 font-sans space-y-4">
          {["user", "company_type"].map((item) => (
            <div key={item} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
          ))}
        </div>

        <div className="py-3 px-7">
          <div className="flex flex-col gap-4 bg-neutral-100 rounded-2xl p-3">
            <div className="flex gap-3 items-center">
              <Skeleton className="h-4 w-4" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex gap-3 items-center bg-neutral-200 rounded-lg py-2 px-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-1 flex-1 rounded-full" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );

  if (isFetchingData) {
    return <SkeletonLoader />;
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ height: "calc(100vh - 9em)" }}
    >
      <Tabs defaultValue="details" className="w-full h-full flex flex-col">
        <TabsList className="inline-flex h-16 items-center text-muted-foreground w-full justify-start rounded-none border-b bg-transparent p-0 shrink-0">
          {" "}
          <TabsTrigger
            className="inline-flex items-center mt-auto ml-3 justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            value="details"
          >
            <span className="mb-4">Details</span>
          </TabsTrigger>
          <TabsTrigger
            className="inline-flex items-center mt-auto justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            value="aiSummary"
          >
            <span className="mb-4">AI Summary</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="flex-1 overflow-y-auto">
          <div className="border-border flex justify-between items-center h-[72px] border-b py-2 px-6">
            <div className="flex gap-3 items-center">
              <h6 className="flex justify-center items-center h-8 w-8 rounded-full bg-[#E2E8F0] text-[#64748B] tracking-tighter font-medium text-sm font-sans leading-[8px] uppercase">
                {contact.firstName?.[0] || "?"} {contact.lastName?.[0] || "?"}
              </h6>
              <h6 className="text-sm font-sans leading-6 font-medium text-neutral-800">
                {contact.firstName || "Unknown"} {contact.lastName || ""}
              </h6>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center">
                <Phone className="size-4" />
              </div>

              <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center">
                <Mail className="size-4" />
              </div>
            </div>
          </div>
          <div className="flex flex-col py-4 px-6 border-border border-b text-sm leading-6 font-sans">
            <p className="flex justify-between">
              <span className="text-neutral-500">Email address</span>
              <span className="w-7/12 text-neutral-900">
                {contact.email || "N/A"}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-neutral-500">Phone</span>
              <span className="w-7/12 text-neutral-900">
                {contact.phoneNumber || "N/A"}
              </span>
            </p>{" "}
            <p className="flex justify-between">
              <span className="text-neutral-500">Country</span>
              <span className="w-7/12 text-neutral-900">India</span>
            </p>{" "}
            <p className="flex justify-between">
              <span className="text-neutral-500">Tag</span>
              <span className="w-7/12 text-neutral-900">Open</span>
            </p>{" "}
            <p className="flex justify-between">
              <span className="text-neutral-500">Source</span>
              <span className="w-7/12 text-neutral-900">
                {selectedActivity?.source === "widget"
                  ? "Website Widget"
                  : selectedActivity?.source === "api"
                  ? "API"
                  : "Playground"}
              </span>
            </p>
          </div>
          {selectedActivity?.conversationData?.memory?.entities?.fields && (
            <div className="flex flex-col py-4 px-6 border-border border-b text-sm leading-6 font-sans">
              {selectedActivity?.conversationData?.memory?.entities?.fields ? (
                Object.entries(
                  selectedActivity.conversationData.memory.entities.fields
                ).map(([key, value]) => (
                  <p key={key} className="flex justify-between">
                    <span className="text-neutral-500">{key}</span>
                    <span className="w-7/12 text-neutral-900">{value}</span>
                  </p>
                ))
              ) : (
                <p className="text-neutral-500">
                  No dynamic data for this conversation
                </p>
              )}
            </div>
          )}
          {selectedActivity?.conversationMode !== "chat" && (
            <div className="py-3 px-7">
              <div className="flex flex-col gap-4 bg-neutral-100 rounded-2xl p-3">
                <div className="flex gap-3 items-center">
                  <Phone className="size-4" />
                  <p className="flex flex-col text-sm font-sans leading-5">
                    <span className="font-bold text-neutral-900">
                      Call ended
                    </span>
                    <span className="text-neutral-500">
                      web call ·{" "}
                      {/* Use the state duration or the initial prop */}
                      {formatTime(
                        duration > 0
                          ? duration
                          : selectedActivity?.callRecording?.durationSeconds
                      )}
                    </span>
                  </p>
                </div>
                {/* Condition: Only show if recording exists AND mode is not chat */}
                {selectedActivity?.callRecording?.url && (
                  <div className="flex gap-3 items-center bg-neutral-200 rounded-lg py-2 px-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full outline-none border-none bg-primary text-background hover:bg-primary/90 disabled:opacity-50"
                      onClick={handlePlayPause}
                      disabled={
                        isLoadingAudio || !selectedActivity?._id || audioError
                      }
                      aria-label={
                        isPlaying ? "Pause recording" : "Play recording"
                      }
                    >
                      {isLoadingAudio ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    {/* --- Progress Bar --- */}
                    <div
                      ref={progressBarRef} // Add ref
                      className="h-1 flex-1 bg-neutral-300 rounded-full relative"
                      role="progressbar" // Changed role to progressbar as it's not interactive
                      aria-label="Audio progress"
                      aria-valuemin="0"
                      aria-valuemax={duration || 0}
                      aria-valuenow={currentTime || 0}
                      aria-valuetext={`${formatTime(
                        currentTime
                      )} of ${formatTime(duration)}`}
                    >
                      {/* Inner progress indicator */}
                      <div
                        className="h-full bg-primary rounded-full absolute top-0 left-0"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    {audioError && (
                      <span className="text-xs text-red-600 ml-2">
                        {audioError}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="aiSummary" className="flex-1 overflow-y-auto">
          <div className="flex flex-col px-6 py-4 border-b border-border">
            {selectedActivity?.conversationSummary ? (
              <>
                <h5 className="text-neutral-950 text-[15px] leading-6 font-medium font-sans">
                  Call summary:{" "}
                  <span className="text-purple-500">Powered by Voxa AI</span>
                </h5>
                <ul className="list-disc list-inside text-sm leading-6 font-sans">
                  {selectedActivity.conversationSummary.conversationPoints.map(
                    (point, index) => (
                      <ListItem key={index} text={point} />
                    )
                  )}
                </ul>
                <h5 className="text-neutral-950 text-[15px] leading-6 font-medium font-sans mt-4">
                  Next step:
                </h5>
                <ul className="list-disc list-inside text-sm leading-6 font-sans">
                  {selectedActivity.conversationSummary.nextSteps.map(
                    (step, index) => (
                      <ListItem key={index} text={step} />
                    )
                  )}
                </ul>
              </>
            ) : (
              <p className="text-neutral-500 text-sm">
                Call summary is not available
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CallSummary;
