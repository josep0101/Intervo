import { Button } from "./components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useToast } from "./hooks/use-toast";
import returnAPIUrl from "./config/config";
import { useWidget } from "./context/WidgetContext";
import {
  Phone,
  Captions,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Mail,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import PropTypes from "prop-types";
import Timer from "./components/Timer";

const backendAPIUrl = returnAPIUrl();

const Call = ({ onBack, agentId, hidePoweredBy }) => {
  const [isTwilioLoaded, setIsTwilioLoaded] = useState(false);
  const { toast } = useToast();
  const [scriptLoadState, setScriptLoadState] = useState("pending");
  const [showTranscript, setShowTranscript] = useState(true);
  const [isFirstDeviceReady, setIsFirstDeviceReady] = useState(true);
  const [callHasEnded, setCallHasEnded] = useState(false);
  const [finalCallDuration, setFinalCallDuration] = useState("00:00");
  const transcriptRef = useRef(null); // Ref for auto-scrolling transcript
  const {
    callState,
    initiateCall,
    endCall,
    setDevice,
    device,
    messages,
    contact,
    widgetConfig,
    fetchCallSummary,
  } = useWidget();
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [callSummary, setCallSummary] = useState(null);

  // Streaming text state
  const [typingMessageIndex, setTypingMessageIndex] = useState(-1);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingAnimationRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  // Auto-scroll transcript when new messages arrive
  useEffect(() => {
    if (transcriptRef.current && showTranscript && messages.length > 0) {
      const scrollContainer = transcriptRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        // Smooth scroll to bottom
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages, showTranscript, typedText]);

  // Typing effect for agent messages
  useEffect(() => {
    // Clear any existing animation frame
    if (typingAnimationRef.current) {
      cancelAnimationFrame(typingAnimationRef.current);
    }

    // Find the last agent message that hasn't been fully typed yet
    const lastAgentMessageIndex = messages.length - 1;

    if (lastAgentMessageIndex >= 0) {
      const lastMessage = messages[lastAgentMessageIndex];

      // Only apply typing effect to agent messages (not user messages)
      if (lastMessage.source && lastMessage.source.toLowerCase() !== "user") {
        const messageText = lastMessage.text || "";

        // If this is a new message or we're not currently typing this message
        if (typingMessageIndex !== lastAgentMessageIndex) {
          setTypingMessageIndex(lastAgentMessageIndex);
          setTypedText("");
          setIsTyping(true);
          lastTypingTimeRef.current = performance.now() + 100; // Initial delay of 100ms
        }

        // If we're currently typing this message and haven't finished
        if (
          typingMessageIndex === lastAgentMessageIndex &&
          typedText.length < messageText.length
        ) {
          const typeAnimation = (currentTime) => {
            if (currentTime >= lastTypingTimeRef.current) {
              setTypedText((prev) => {
                const nextText = messageText.slice(0, prev.length + 1);

                // If we've reached the end, stop typing
                if (nextText.length >= messageText.length) {
                  setIsTyping(false);
                  return messageText;
                }

                // Schedule next character with 500ms delay
                lastTypingTimeRef.current = currentTime + 50;
                typingAnimationRef.current =
                  requestAnimationFrame(typeAnimation);
                return nextText;
              });
            } else {
              // Continue checking until it's time for the next character
              typingAnimationRef.current = requestAnimationFrame(typeAnimation);
            }
          };

          // Start the animation
          typingAnimationRef.current = requestAnimationFrame(typeAnimation);
        }
      }
    }

    // Cleanup function
    return () => {
      if (typingAnimationRef.current) {
        cancelAnimationFrame(typingAnimationRef.current);
      }
    };
  }, [messages, typingMessageIndex, typedText]);

  // Function to get Twilio token from backend
  async function getToken() {
    try {
      const response = await fetch(`${backendAPIUrl}/token`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch Twilio token");
      }
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Error fetching token:", error);
      toast({
        title: "Error",
        description: "Failed to get Twilio token",
        variant: "destructive",
      });
    }
  }

  function handleTwilioScriptLoad() {
    console.log("Twilio script loaded successfully");
    setIsTwilioLoaded(true);
    setScriptLoadState("loaded");
  }

  function handleTwilioScriptError() {
    console.error("Failed to load Twilio script");
    setScriptLoadState("failed");
  }

  // Script loading effect
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://media.twiliocdn.com/sdk/js/client/v1.13/twilio.min.js";
    script.async = true;
    script.onload = handleTwilioScriptLoad;
    script.onerror = handleTwilioScriptError;
    document.body.appendChild(script);

    console.log("script added");
    return () => {
      console.log("script removed");
      // document.body.removeChild(script);
    };
  }, []);

  // Monitor script load state
  useEffect(() => {
    console.log("Script load state:", scriptLoadState);
    if (scriptLoadState === "failed") {
      toast({
        title: "Error",
        description: "Failed to load Twilio SDK",
        variant: "destructive",
      });
    }
  }, [scriptLoadState, toast]);

  // Device setup effect
  useEffect(() => {
    let mounted = true;

    async function setupDevice() {
      try {
        const token = await getToken();

        console.log("tokenizor", token, mounted);
        if (!token || !mounted) return;

        const twilioDevice = new window.Twilio.Device(token, {
          debug: true,
        });

        twilioDevice.on("ready", () => {
          console.log("Twilio.Device is ready", mounted);
          if (mounted) {
            setDevice(twilioDevice);
            if (isFirstDeviceReady) {
              initiateCall(agentId, twilioDevice);
              setIsFirstDeviceReady(false);
            }
          }
        });

        twilioDevice.on("error", (error) => {
          console.error("Twilio Device Error:", error);
          toast({
            title: "Call Error",
            description: error.message,
            variant: "destructive",
          });
        });

        twilioDevice.on("disconnect", () => {
          if (mounted) {
            // Mark call as ended so we show the summary - final duration is tracked by Timer component
            setCallHasEnded(true);
            endCall();
            // Don't navigate back automatically - let user see the summary
            // onBack();
          }
        });
      } catch (error) {
        console.error("Failed to initialize Twilio device:", error);
        toast({
          title: "Setup Error",
          description: "Failed to initialize Twilio device",
          variant: "destructive",
        });
      }
    }

    if (isTwilioLoaded && !device) {
      setupDevice();
    }

    return () => {
      mounted = false;
      // if (device) {
      //   console.log("device destroyed");
      //   device.destroy();
      // }
    };
  }, [isTwilioLoaded, device, endCall, toast]);

  // Use endCall from context
  function handleEndCall() {
    try {
      // Set call ended state - final duration is already tracked by Timer component
      setCallHasEnded(true);

      // Also properly clean up the call
      if (device) {
        device.disconnectAll();
      }
      endCall();
    } catch (error) {
      console.error("Error ending call:", error);
      toast({
        title: "Error",
        description: "Failed to end call properly",
        variant: "destructive",
      });
    }
  }

  const ListItem = ({ text }) => (
    <li className="text-purple-500">
      <span className="text-neutral-600">{text}</span>
    </li>
  );

  // Add prop types for ListItem
  ListItem.propTypes = {
    text: PropTypes.string.isRequired,
  };

  console.log(agentId, "agent state");

  // Handle timer duration updates for final call duration
  const handleTimerDurationChange = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
    setFinalCallDuration(formattedTime);
  };

  useEffect(() => {
    console.log("callHasEnded", callHasEnded);
    if (callHasEnded) {
      const getSummary = async () => {
        setIsLoadingSummary(true);
        try {
          const data = await fetchCallSummary();
          console.log(data, "summary call");
          if (data?.summary) {
            setCallSummary(data.summary);
          }
        } catch (error) {
          console.error("Failed to fetch call summary:", error);
          toast({
            title: "Error",
            description: "Failed to load call summary",
            variant: "destructive",
          });
        } finally {
          setIsLoadingSummary(false);
        }
      };

      getSummary();
    }
  }, [callHasEnded, fetchCallSummary, toast]);

  const handleSendEmail = () => {
    if (!callSummary) {
      console.error("Missing summary or contact email for sending transcript.");
      toast({
        title: "Error",
        description: "Could not send email. Summary or recipient missing.",
        variant: "destructive",
      });
      return;
    }

    const agentName = widgetConfig?.displayName || "Voxa Assistant"; // Use displayName or default
    const subject = `Here's your conversation summary with ${agentName}`;

    let body = "Call Summary:\n";
    if (
      callSummary.conversationPoints &&
      callSummary.conversationPoints.length > 0
    ) {
      body += callSummary.conversationPoints
        .map((point) => `- ${point}`)
        .join("\n");
      body += "\n\n"; // Add space before next steps
    } else {
      body += "(No specific points captured)\n\n";
    }

    if (callSummary.nextSteps && callSummary.nextSteps.length > 0) {
      body += "Next Steps:\n";
      body += callSummary.nextSteps.map((step) => `- ${step}`).join("\n");
    } else {
      body += "Next Steps:\n(No specific next steps identified)";
    }

    const mailtoUrl = `mailto:${
      contact?.email || ""
    }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open default email client
    window.location.href = mailtoUrl;
  };

  const renderActiveCall = () => (
    <>
      <div className="bg-black pt-[30px] px-8 pb-[22px] h-full max-h-[134px] rounded-t-[18px] flex flex-col justify-between gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-[34px] font-inter font-semibold leading-[40.8px] text-[#F8F8F8]/[.7]">
            {callState === "ringing"
              ? "Ringing..."
              : callState === "connected"
              ? "In Call"
              : callState === "idle"
              ? isFirstDeviceReady
                ? "Preparing..."
                : "Ready to Call"
              : "Ready to Call"}
          </h2>
          <Timer
            callState={callState}
            onDurationChange={handleTimerDurationChange}
            className="text-2xl leading-8 font-semibold text-[#F1F5F9] font-sans"
          />
        </div>
        {callState === "connected" || callState === "ringing" ? (
          <Button
            onClick={handleEndCall}
            className="h-10 bg-red-600 text-white text-sm leading-6 font-medium font-sans hover:bg-red-700"
          >
            <Phone /> End Call
          </Button>
        ) : (
          <Button
            onClick={() => initiateCall(agentId)}
            disabled={!device}
            className="h-10 bg-green-600 text-white text-sm leading-6 font-medium font-sans hover:bg-green-700"
          >
            <Phone /> Start Call
          </Button>
        )}
      </div>
      <div className="px-5 py-3 flex flex-col justify-between h-full">
        <div className="flex h-full flex-col">
          <button
            className="h-[76px] w-full flex justify-between gap-[22px] py-[22px] px-6  bg-white hover:bg-neutral-100 rounded-[10px] items-center shadow-md border border-black/[.14] disabled:cursor-not-allowed"
            onClick={() => setShowTranscript(!showTranscript)}
            disabled={callState !== "connected"}
          >
            <Captions className="h-8 w-8" />
            <p className="w-full text-left font-inter font-semibold leading-[22.4px]">
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </p>
            {showTranscript ? (
              <ChevronUp className="h-8 w-8" />
            ) : (
              <ChevronDown className="h-8 w-8" />
            )}
          </button>
          {showTranscript && (
            <ScrollArea className="max-h-[390px]" ref={transcriptRef}>
              <div className="space-y-3 mt-2">
                {messages.map((message, index) => {
                  // Check if this is the message currently being typed
                  const isCurrentlyTyping =
                    typingMessageIndex === index && isTyping;
                  const isAgentMessage =
                    message.source && message.source.toLowerCase() !== "user";

                  // Determine what text to show
                  let displayText = message.text;
                  if (isCurrentlyTyping && isAgentMessage) {
                    displayText = typedText + (isTyping ? "|" : "");
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-start pr-2 pl-1.5 gap-2"
                    >
                      <p className="text-xs text-neutral-500 leading-6 font-medium font-sans">
                        {message.time}
                      </p>
                      <p className="text-sm text-neutral-500 leading-6">
                        <span className="font-semibold text-neutral-950">
                          {message.source}:
                        </span>{" "}
                        <ReactMarkdown>{displayText}</ReactMarkdown>
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
        {!hidePoweredBy && (
          <div
            className={`text-neutral-500 font-inter text-sm leading-4 pt-1 text-center mt-4 ${
              showTranscript && "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
            }`}
          >
            <a
              href="https://voxa.ai?utm_source=widget"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-600"
            >
              Powered by voxa
            </a>
          </div>
        )}
      </div>
    </>
  );

  const renderCallEnded = () => (
    <>
      <div className="bg-black pt-[30px] px-8 pb-[22px] h-full max-h-[134px] rounded-t-[18px] flex flex-col justify-between gap-3">
        <button
          onClick={onBack}
          className="text-[#F1F5F9] text-base font-medium leading-6 font-sans flex items-center gap-2 w-fit bg-transparent pl-0 border-none active:border-none"
        >
          <ChevronLeft className="h-6 w-6" /> Back
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-[#F8F8F8] text-2xl font-semibold leading-6 tracking-[-0.36px] font-sans">
            Call ended
          </h2>
          <h2 className="text-[#F1F5F9] text-2xl font-semibold leading-8 tracking-[-0.6px] font-sans">
            {finalCallDuration}
          </h2>
        </div>
      </div>
      <div className="px-5 py-6 flex flex-col justify-between h-full">
        <div className="flex h-full flex-col gap-2 px-1.5">
          <h5 className="text-neutral-950 text-[15px] leading-6 font-medium font-sans">
            Call summary:{" "}
            <span className="text-purple-500">Powered by Voxa AI</span>
          </h5>

          {isLoadingSummary ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : callSummary && callSummary.conversationPoints ? (
            <>
              {/* Render conversation points */}
              <ul className="list-disc list-inside text-sm leading-6 font-sans">
                {callSummary.conversationPoints.map((point, index) => (
                  <li key={index} className="text-purple-500">
                    <span className="text-neutral-600">{point}</span>
                  </li>
                ))}
              </ul>

              {/* Render next steps if they exist */}
              {callSummary.nextSteps && callSummary.nextSteps.length > 0 && (
                <>
                  <h5 className="text-neutral-950 text-[15px] leading-6 font-medium font-sans mt-4">
                    Next steps:
                  </h5>
                  <ul className="list-disc list-inside text-sm leading-6 font-sans">
                    {callSummary.nextSteps.map((step, index) => (
                      <li key={index} className="text-purple-500">
                        <span className="text-neutral-600">{step}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <div className="text-sm leading-6 font-sans text-neutral-500">
              Call summary is not available
            </div>
          )}

          <Button
            className="bg-secondary text-primary h-10 text-sm leading-6 font-medium font-sans hover:bg-secondary/80 mt-4"
            onClick={handleSendEmail}
            disabled={!callSummary}
          >
            <Mail /> Send transcript to my email
          </Button>
        </div>
        {!hidePoweredBy && (
          <div className="text-neutral-500 font-inter text-sm leading-4 pt-1 text-center mt-4">
            <a
              href="https://voxa.ai?utm_source=widget"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-600"
            >
              Powered by voxa
            </a>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {scriptLoadState === "failed" && (
        <div className="text-red-500">
          Failed to load Twilio SDK. Please check your network connection.
        </div>
      )}
      {callHasEnded ? renderCallEnded() : renderActiveCall()}
    </>
  );
};

// Add prop types for Call component
Call.propTypes = {
  onBack: PropTypes.func, // Mark as func, adjust if required
  agentId: PropTypes.string, // Mark as string, adjust if required
  hidePoweredBy: PropTypes.bool,
};

export default Call;
