"use client";
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  memo,
} from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkles,
  Radio,
  AudioLines,
  SendHorizonal,
  MessageSquare,
  SlidersHorizontal,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SpeechSettings from "./SpeechSettings";
import VoiceSettings from "./VoiceSettings";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import returnAPIUrl from "@/config/config";
import { usePlayground } from "@/context/AgentContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import PublishDialog from "./PublishDialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import LiveDialog from "./LiveDialog";
import VoiceDialog from "./VoiceDialog";
import Link from "next/link";
import AgentPlayGroundChat from "./AgentPlayGroundChat";
import { transformAgentData } from "@/lib/utils";
import WelcomeDialog from "./WelcomeDialog";
import EmbeddedWelcomeDialog from "./EmbeddedWelcomeDialog";
import KnowledgeBaseDialog from "./KnowledgeBaseDialog";
import KnowledgeBaseSelector from "@/components/playground/KnowledgeBaseSelector";
import { useSource } from "@/context/SourceContext";
import { useCallbackRef } from "@/hooks/useCallbackRef";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useNavigationOverride } from "@/hooks/useNavigationOverride";
import { Skeleton } from "@/components/ui/skeleton";
import VoxaApp from "voxa-widget/src/App";
import OnboardingOverlay from "@/components/playground/OnboardingOverlay";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LuAlertTriangle, LuCheckCircle2, LuAlertCircle } from "react-icons/lu";

const backendAPIUrl = returnAPIUrl();

export const runtime = "edge";

const onboardingStepsConfig = [
  {
    key: "widget", // Matches agentOnboardingStatus keys
    targetElementSelector: "#voxa-app-wrapper",
    text: "Experience your<br/>AI agent here",
    // arrowRotation: 0, // Optional: override auto-rotation
    // textOffset: { x: 0, y: -100 }, // Optional: override default offset
  },
  {
    key: "voiceSettings",
    targetElementSelector: "#voice-dialog-wrapper", // Ensure this ID exists on the target
    text: "Configure your<br/>voice & speech settings here",
    // Example of overriding defaults if needed for this specific step:
    // arrowRotation: -90,
    // textOffset: { x: 50, y: 0 }
  },
  // Add more steps here, e.g., for KnowledgeBaseSelector, SpeechSettings card, etc.
];

function PlaygroundPage({ params }) {
  const { toast } = useToast();
  const { slug, workspaceid } = React.use(params);
  const {
    isAuthenticated,
    checkAuthStatus,
    getWsToken,
    userProfile,
    markAgentOnboardingAsCompleted,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchWithAuth } = useAuthenticatedFetch();
  const [activeTab, setActiveTab] = useState("transcript");
  const { getAllSources, needsTraining } = useSource();

  // State for knowledge base sources
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState("");

  // Add this state near the top of the component
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFirstTimePublish, setIsFirstTimePublish] = useState(false);

  // State for current onboarding step
  const [currentOnboardingStepIndex, setCurrentOnboardingStepIndex] =
    useState(-1); // Start at -1 (inactive)

  // Local state to track completed steps during this session
  const [localCompletedSteps, setLocalCompletedSteps] = useState(new Set());

  useEffect(() => {
    console.log(isAuthenticated, "isAuthenticated");
    if (
      typeof window !== "undefined" &&
      (isAuthenticated === false || isAuthenticated === "failed")
    ) {
      if (!isAuthenticated) {
        checkAuthStatus();
      }
      if (isAuthenticated === "failed") {
        router.push("/login");
      }
    }
  }, [isAuthenticated, checkAuthStatus, router]);

  const [device, setDevice] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [isTwilioLoaded, setIsTwilioLoaded] = useState(false);
  const [callType, setCallType] = useState("live");
  const [phoneNumber, setPhoneNumber] = useState({
    agentId: slug,
  }); // usestate used when publishing agent for the first time
  const [publishAgentDialogopen, setPublishAgentDialogopen] = useState(false);
  const [advancedVoiceFlowDialogOpen, setAdvancedVoiceFlowDialogOpen] =
    useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Welcome Dialog open/note state
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [versionChecked, setVersionChecked] = useState(false);
  const [knowledgeBaseDialogOpen, setKnowledgeBaseDialogOpen] = useState(false);
  const [isManagingKnowledgeBase, setIsManagingKnowledgeBase] = useState(false);
  const {
    aiConfig,
    setAIConfig,
    fetchAIConfig,
    updateAIConfig,
    isFetchingAgent,
    publishAgent,
    setupWebSocket,
    cleanupWebSocket,
    conversationState,
    mode,
    setMode,
    workflowNeedsUpdate,
  } = usePlayground();

  // Handler for when workflow is successfully generated
  const handleWorkflowGenerated = useCallback(
    (shouldTriggerVersionCheck = true) => {
      // Only reset version check if we want to trigger version-based dialog opening
      if (shouldTriggerVersionCheck) {
        setVersionChecked(false);
      }
    },
    []
  ); // Remove dependency on setVersionChecked to break potential cycles

  // Check agent version to determine if dialog should be shown
  useEffect(() => {
    // Only proceed if aiConfig is loaded and has properties
    if (aiConfig && Object.keys(aiConfig).length > 0 && !versionChecked) {
      // If the agent version is 0 or null, show the welcome dialog
      if (aiConfig.version === 0 || aiConfig.version === null) {
        setWelcomeDialogOpen(true);
        setKnowledgeBaseDialogOpen(false);
      }
      // If the agent version is 1, show the knowledge base dialog
      else if (aiConfig.version === 1) {
        setWelcomeDialogOpen(false);
        setKnowledgeBaseDialogOpen(true);
      }
      // For other versions, don't show either dialog
      else {
        setWelcomeDialogOpen(false);
        setKnowledgeBaseDialogOpen(false);
      }
      // Mark that we've checked the version to avoid repeated checks
      setVersionChecked(true);
    }
  }, [aiConfig?._id, versionChecked]); // Only depend on ID, not the entire object

  useEffect(() => {
    console.log("Slug effect running, slug:", slug);
    if (slug) fetchAIConfig(slug);
  }, [slug]);

  // Function to get Twilio token from backend
  async function getToken() {
    try {
      const response = await fetchWithAuth(`${backendAPIUrl}/token`);
      if (!response.ok) {
        throw new Error("Failed to fetch Twilio token");
      }
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  }

  // Update useEffect to depend on isTwilioLoaded
  useEffect(() => {
    let mounted = true;

    async function setupDevice() {
      try {
        const token = await getToken();
        if (!token || !mounted) return;

        const twilioDevice = new window.Twilio.Device(token, { debug: true });

        twilioDevice.on("ready", () => {
          console.log("Twilio.Device is ready.", mounted);
          setDevice(twilioDevice);
        });

        // ... other event listeners ...
      } catch (error) {
        console.error("Failed to initialize Twilio device:", error);
      }
    }

    // Only run setupDevice when Twilio is loaded
    if (isTwilioLoaded) {
      setupDevice();
    }

    return () => {
      console.log("unmounting", mounted);
      mounted = false;
      if (device) {
        device.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTwilioLoaded]);

  // Make a call
  async function handleCall() {
    if (!device) return;

    setCallLoading(true);
    try {
      // 1. Get WebSocket token and initialize connection
      const wsToken = await getWsToken();
      if (!wsToken) {
        throw new Error("Failed to get WebSocket token");
      }
      await setupWebSocket(wsToken, aiConfig._id);

      // 2. Prepare the call
      const response = await fetchWithAuth(`${backendAPIUrl}/stream/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiConfig: JSON.stringify({ agentId: aiConfig._id, playground: true }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to prepare audio");
      }

      const prepareData = await response.json();
      const updatedAiConfig = {
        ...aiConfig,
        conversationId: prepareData.conversationId,
        agentId: aiConfig._id,
        playground: true,
      };

      // 3. Start the call
      const params = {
        To: "client",
        aiConfig: JSON.stringify(updatedAiConfig),
      };
      const connection = device.connect(params);
      if (!connection) {
        throw new Error("Failed to make a call. Device not ready.");
      }

      setIsCalling(true);
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCallLoading(false);
    }
  }

  // Handle hanging up
  function handleHangUp() {
    if (device) {
      device.disconnectAll();
      cleanupWebSocket(); // Clean up WebSocket when call ends
      setIsCalling(false);
    }
  }

  // Replace handleTwilioScriptLoad with this simpler version
  function handleTwilioScriptLoad() {
    console.log("Twilio SDK loaded.");
    setIsTwilioLoaded(true);
  }

  // Update the handlePublishAgentClick function
  const handlePublishAgentClick = async () => {
    setIsPublishing(true);
    // Remember initial publish state before updating
    const wasPublished = aiConfig?.published;

    try {
      const res = await publishAgent(slug);
      if (res) {
        // If this was the first time publishing, mark it
        if (!wasPublished) {
          setIsFirstTimePublish(true);
          setPublishAgentDialogopen(true);
        }

        setAIConfig({ ...aiConfig, published: true });
        toast({
          title: "Agent published/updated",
          variant: "success",
        });
        return true;
      } else {
        toast({
          title: "Error while publishing/updating agent",
          variant: "destructive",
        });
        return false;
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleChatStart = async () => {
    setChatLoading(true);
    try {
      // 1. Get WebSocket token and prepare conversation
      const wsToken = await getWsToken();
      if (!wsToken) {
        throw new Error("Failed to get WebSocket token");
      }

      // 2. Prepare the conversation
      const response = await fetchWithAuth(`${backendAPIUrl}/stream/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aiConfig: JSON.stringify({ agentId: aiConfig._id, playground: true }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to prepare conversation");
      }

      const prepareData = await response.json();
      const updatedAiConfig = transformAgentData(
        {
          ...aiConfig,
          agentId: aiConfig._id,
          playground: true,
        },
        prepareData.conversationId
      );

      // 3. Initialize WebSocket with the conversation data and updated config
      await setupWebSocket(wsToken, aiConfig._id, "chat", updatedAiConfig);
      setIsCalling(true);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Fetch knowledge base sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const sources = await getAllSources();
        setKnowledgeBases(sources);

        // If aiConfig has a selected source, set it
        if (aiConfig?.knowledgeBase?.sources?.[0]) {
          setSelectedKnowledgeBase(aiConfig.knowledgeBase.sources[0]);
        }

        // Determine initial onboarding step index after fetching sources and aiConfig
        if (userProfile?.agentOnboardingStatus) {
          const firstUncompletedStepIndex = onboardingStepsConfig.findIndex(
            (step) => !userProfile.agentOnboardingStatus[step.key]
          );
          setCurrentOnboardingStepIndex(firstUncompletedStepIndex); // Will be -1 if all completed
        }
      } catch (error) {
        console.error("Error fetching knowledge base sources:", error);
      }
    };

    if (aiConfig?._id) {
      fetchSources();
    }
  }, [
    getAllSources,
    aiConfig?._id,
    aiConfig?.knowledgeBase?.sources,
    userProfile?.agentOnboardingStatus,
  ]);

  // Handle knowledge base selection
  const handleKnowledgeBaseSelect = async (sourceId) => {
    setSelectedKnowledgeBase(sourceId);
    try {
      await updateAIConfig(
        {
          knowledgeBase: {
            sources: [sourceId],
          },
        },
        "page-knowledge-base-select"
      );
      toast({
        title: "Knowledge base updated",
        variant: "success",
      });
    } catch (error) {
      console.error("Error updating knowledge base:", error);
      toast({
        title: "Failed to update knowledge base",
        variant: "destructive",
      });
    }
  };

  // Handle opening knowledge base dialog for management
  const handleManageKnowledgeBase = () => {
    setIsManagingKnowledgeBase(true);
    setKnowledgeBaseDialogOpen(true);
  };

  // Handle closing knowledge base dialog
  const handleKnowledgeBaseDialogClose = (isOpen) => {
    setKnowledgeBaseDialogOpen(isOpen);
    if (!isOpen) {
      setIsManagingKnowledgeBase(false);
    }
  };

  const handleOnboardingStepComplete = async () => {
    if (currentOnboardingStepIndex === -1) return;

    const currentStepConfig = onboardingStepsConfig[currentOnboardingStepIndex];
    if (!currentStepConfig) return;

    // Mark current step as completed locally
    const newCompletedSteps = new Set([
      ...localCompletedSteps,
      currentStepConfig.key,
    ]);
    setLocalCompletedSteps(newCompletedSteps);

    // Check if ALL onboarding steps are now complete
    const allStepsCompleted = onboardingStepsConfig.every((step) =>
      newCompletedSteps.has(step.key)
    );

    if (allStepsCompleted) {
      console.log("All onboarding steps completed! Marking as completed.");
      setCurrentOnboardingStepIndex(-1); // Hide overlay immediately
      markAgentOnboardingAsCompleted(); // Make API call without waiting
      return;
    }

    // Find next uncompleted step
    const nextStepIndex = onboardingStepsConfig.findIndex(
      (step, index) =>
        index > currentOnboardingStepIndex && !newCompletedSteps.has(step.key)
    );

    if (nextStepIndex !== -1) {
      setCurrentOnboardingStepIndex(nextStepIndex);
    } else {
      // All steps are done
      setCurrentOnboardingStepIndex(-1);
    }
  };

  // Use the navigation override hook
  const cleanupCallback = useNavigationOverride({
    slug,
    handleHangUp,
    cleanupWebSocket,
    isCalling,
    device,
    setIsCalling,
    setCallLoading,
    setChatLoading,
  });

  // Cleanup on unmount - just for device, as other cleanup is handled by the hook
  useEffect(() => {
    return () => {
      // Additional device cleanup
      if (device) {
        try {
          device.destroy();
        } catch (error) {
          console.error("Error destroying device:", error);
        }
      }
    };
  }, [device]);

  return (
    <div className="flex justify-center w-full">
      <div className="grid grid-cols-1 md:grid-cols-10 max-w-[1400px] w-full h-auto md:h-[calc(100vh-7rem)] gap-4 px-4 md:px-0">
        {/* Middle Panel - Chat Interface (moved to left) */}
        <div className="col-span-1 md:col-span-4 flex flex-col items-center h-full mb-6 md:mb-0 w-full">
          {isFetchingAgent ? (
            // Knowledge Base Section Skeleton
            <>
              <div className="w-full md:w-[534px] mb-4">
                <Skeleton className="h-12 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              {/* Chat Area Skeleton */}
              <div className="flex-1 w-full md:w-[534px]">
                <Skeleton className="h-full w-full" />
              </div>
            </>
          ) : (
            <>
              {/* Knowledge Base Selector - Added above Chat Area */}
              <KnowledgeBaseSelector
                onManageSource={handleManageKnowledgeBase}
                knowledgeBases={knowledgeBases}
                selectedKnowledgeBase={selectedKnowledgeBase}
                onSelectKnowledgeBase={handleKnowledgeBaseSelect}
              />

              {/* Chat Area - responsive width */}
              <div className="flex-1 border rounded-lg w-full md:w-[534px]">
                <EmbeddedWelcomeDialog
                  agentType={aiConfig?.agentType || ""}
                  agentPrompt={aiConfig?.prompt || ""}
                  onWorkflowGenerated={() => handleWorkflowGenerated(false)}
                />
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Speech Settings (moved to middle) */}
        <div
          id="voice-dialog-wrapper"
          className="col-span-1 md:col-span-3 flex-col flex gap-4 h-full w-full overflow-auto mb-6 md:mb-4"
        >
          <div
            className="flex items-center gap-4 mb-[2px] justify-start w-full"
            style={{ marginBottom: "2px" }}
          >
            {!isFetchingAgent && <VoiceDialog />}
          </div>

          {isFetchingAgent ? (
            // Speech Settings Skeletons
            <>
              {/* Voice Dialog Skeleton */}
              <Skeleton className="h-10 w-36 mb-4" />

              {/* Voice Settings Card Skeleton */}
              <Card className="p-6 space-y-6 mb-4">
                <div className="flex items-center gap-2 mb-6">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-[1px] w-full" />
                {/* Voice Type */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                {/* Voice Style */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </Card>

              {/* Speech Settings Card Skeleton */}
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-[1px] w-full" />
                {/* Ambient Audio */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                {/* Response Threshold */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-5 w-full" />
                </div>
                {/* Conversational Feedback */}
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-[90%]" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                {/* Lexical Enhancement */}
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-10 w-full" />
                </div>
                {/* Utterance Optimization */}
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-[90%]" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                {/* Raw Transcription Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-[90%]" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </Card>
            </>
          ) : (
            <>
              <VoiceSettings />
              <SpeechSettings />
            </>
          )}
        </div>

        <div className="col-span-1 md:col-span-3 flex flex-col h-full">
          {/* Buttons above the right panel */}
          <div className="flex justify-end gap-4 mb-4">
            {isFetchingAgent ? (
              <>
                <Skeleton className="h-11 w-[180px]" />
                <Skeleton className="h-11 w-[130px]" />
              </>
            ) : (
              <>
                <Dialog
                  open={publishAgentDialogopen}
                  onOpenChange={setPublishAgentDialogopen}
                >
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            {aiConfig?.published ? (
                              // For published agents, just a button (not DialogTrigger)
                              <Button
                                onClick={handlePublishAgentClick}
                                disabled={
                                  isPublishing ||
                                  workflowNeedsUpdate ||
                                  needsTraining
                                }
                                className="flex justify-end items-center gap-1 px-4 py-2 bg-primary hover:bg-primary/90 text-sm leading-6 font-medium font-sans text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isPublishing
                                  ? "Updating Agent..."
                                  : "Update Agent"}
                              </Button>
                            ) : (
                              // For unpublished agents
                              <Button
                                variant="primary"
                                onClick={handlePublishAgentClick}
                                disabled={
                                  isPublishing ||
                                  workflowNeedsUpdate ||
                                  needsTraining
                                }
                                className="flex justify-end items-center gap-1 px-4 py-2 bg-primary hover:bg-primary/90 text-sm leading-6 font-medium font-sans text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isPublishing
                                  ? "Publishing Agent..."
                                  : "Publish Agent"}
                              </Button>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white border border-gray-200 shadow-lg rounded-lg p-4 max-w-sm">
                          {workflowNeedsUpdate || needsTraining ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <LuAlertCircle className="h-3.5 w-3.5 text-gray-500" />
                                <p className="font-medium text-sm text-gray-900">
                                  Please finish the following steps to publish:
                                </p>
                              </div>
                              <ul className="space-y-2 ml-1">
                                {workflowNeedsUpdate && (
                                  <li className="flex items-start gap-2 text-sm text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <span>
                                      Generate workflow with updated prompt
                                    </span>
                                  </li>
                                )}
                                {needsTraining && (
                                  <li className="flex items-start gap-2 text-sm text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <span>
                                      Train agent with updated knowledge
                                    </span>
                                  </li>
                                )}
                              </ul>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <LuCheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <p className="font-medium text-sm text-gray-900">
                                Ready to publish!
                              </p>
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <a
                      href={`/${workspaceid}/agent/${slug}/connect`}
                      className="flex items-center justify-center bg-primary hover:bg-primary/90 px-3 py-2 border-l border-primary-foreground/20 text-primary-foreground rounded-md"
                    >
                      <SlidersHorizontal className="h-5 w-5" />
                    </a>
                  </div>

                  {/* Only show LiveDialog when agent was just published for the first time */}
                  {isFirstTimePublish && (
                    <LiveDialog
                      open={publishAgentDialogopen}
                      handlePublishAgentClick={handlePublishAgentClick}
                      agentId={slug}
                      phoneNumber={
                        phoneNumber?.phoneNumber
                          ? phoneNumber?.phoneNumber?.phoneNumber
                          : aiConfig?.phoneNumber?.phoneNumber
                      }
                      recentlyPublished={true}
                    />
                  )}
                </Dialog>
              </>
            )}
          </div>

          {/* Left Panel (moved to right) */}
          {isFetchingAgent ? (
            // Try Agent Panel Skeleton
            <div className="p-4 h-full">
              <div className="flex justify-between mb-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-40" />
              </div>
              <Skeleton className="h-[1px] w-full mb-6" />
              <div className="flex flex-col items-center justify-center h-[calc(100%-60px)]">
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-16 w-[70%] mb-6" />
                <Skeleton className="h-11 w-32 mb-2" />
                <Skeleton className="h-11 w-32" />
              </div>
            </div>
          ) : (
            <div
              id="voxa-app-wrapper"
              className="md:ml-4 mt-2 rounded-md h-full min-h-[400px] relative"
            >
              <VoxaApp
                source="voxa.ai"
                widgetId={aiConfig?.widgetId}
                agentId={aiConfig?._id}
                initialValidationStatus="valid"
                initialConfig={{
                  agentName: aiConfig?.name,
                  agentType: aiConfig?.agentType,
                  widgetConfiguration: aiConfig?.widgetConfiguration,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Overlay - conditional rendering based on current step */}
      {currentOnboardingStepIndex !== -1 &&
        onboardingStepsConfig[currentOnboardingStepIndex] &&
        aiConfig?.version > 1 && (
          <OnboardingOverlay
            targetElementSelector={
              onboardingStepsConfig[currentOnboardingStepIndex]
                .targetElementSelector
            }
            onboardingStepKey={
              onboardingStepsConfig[currentOnboardingStepIndex].key
            } // Used by overlay to check its own status if needed, but parent controls flow
            text={onboardingStepsConfig[currentOnboardingStepIndex].text}
            arrowRotation={
              onboardingStepsConfig[currentOnboardingStepIndex].arrowRotation
            } // Pass specific rotation if defined
            textOffset={
              onboardingStepsConfig[currentOnboardingStepIndex].textOffset
            } // Pass specific offset if defined
            preferViewportCenter={
              onboardingStepsConfig[currentOnboardingStepIndex]
                .preferViewportCenter !== undefined
                ? onboardingStepsConfig[currentOnboardingStepIndex]
                    .preferViewportCenter
                : true
            } // Pass specific preference
            hideArrow={
              onboardingStepsConfig[currentOnboardingStepIndex].hideArrow
            } // Pass specific hideArrow if defined
            // onDismiss will now act as "onNext" or "onCompleteStep"
            onDismiss={handleOnboardingStepComplete}
          />
        )}

      {/* Import Twilio script */}
      <Script
        src="https://media.twiliocdn.com/sdk/js/client/v1.13/twilio.min.js"
        strategy="afterInteractive"
        onLoad={handleTwilioScriptLoad}
      />
      <WelcomeDialog
        isOpen={welcomeDialogOpen}
        onOpenChange={setWelcomeDialogOpen}
        agentType={aiConfig?.agentType || ""}
        agentPrompt={aiConfig?.prompt || ""}
        onWorkflowGenerated={handleWorkflowGenerated}
        embedded={false}
      />
      <KnowledgeBaseDialog
        isOpen={knowledgeBaseDialogOpen}
        onOpenChange={handleKnowledgeBaseDialogClose}
        isManageMode={isManagingKnowledgeBase}
        knowledgeBaseName={
          isManagingKnowledgeBase && selectedKnowledgeBase
            ? knowledgeBases.find((kb) => kb._id === selectedKnowledgeBase)
                ?.name || ""
            : ""
        }
      />
    </div>
  );
}

export default memo(PlaygroundPage);
