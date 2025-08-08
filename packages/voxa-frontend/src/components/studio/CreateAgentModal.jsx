"use client";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  StepIndicator,
  DialogHeader as CustomDialogHeader,
} from "../ui/stepper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import AgentTypeCard from "@/components/AgentTypeCard";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayground } from "@/context/AgentContext";
import { LoadingButton } from "../ui/loadingButton";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  LuBell,
  LuHeadphones,
  LuHeartHandshake,
  LuPlusCircle,
  LuMessageSquare,
  LuPhone,
} from "react-icons/lu";

export default function CreateAgentModal() {
  const [agentType, setAgentType] = useState("");
  const { workspaceId } = useWorkspace();
  const { createNewAgent } = usePlayground();
  const router = useRouter();

  const AgentTypes = () => {
    const data = [
      {
        name: "Receptionist",
        description: "Greet visitors and direct inquiries to the right place",
        icon: <LuBell className="w-6 h-6" />,
      },
      {
        name: "Customer Services",
        description: "Answer questions and resolve customer issues efficiently",
        icon: <LuHeadphones className="w-6 h-6" />,
      },
      {
        name: "Lead Qualification",
        description:
          "Identify and convert potential customers into sales opportunities",
        icon: <LuHeartHandshake className="w-6 h-6" />,
      },
      {
        name: "Create agent using AI",
        description:
          "Let AI suggest the best agent type based on your business needs",
        icon: <LuPlusCircle className="w-6 h-6" />,
        highlight: true,
      },
    ];

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          {data.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-[22px] p-[22px_24px] border border-[rgba(0,0,0,0.14)] rounded-[10px] cursor-pointer bg-white shadow-[2px_2px_15px_0px_rgba(0,0,0,0.10)] hover:shadow-md transition-all ${
                agentType === item.name ? "border-primary/50 bg-primary/5" : ""
              }`}
              onClick={() => setAgentType(item.name)}
            >
              <div className="text-black">{item.icon}</div>
              <div className="flex flex-col gap-1.5">
                <div className="font-medium">
                  {item.highlight ? (
                    <p>
                      <span>{item.name.split("using ")[0]}</span>
                      <span className="text-purple-500">using AI</span>
                    </p>
                  ) : (
                    item.name
                  )}
                </div>
                <p className="text-sm text-neutral-500 break-words whitespace-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CreateAgent = ({ agentType }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [agentData, setAgentData] = useState({
      voice: "male",
      name: "",
      language: "english",
      preferredSetupType: "widget",
    });

    const handleCreateAgent = async () => {
      // Validate fields
      const newErrors = {};
      if (!agentData.name.trim()) {
        newErrors.name = "Agent name is required";
      }

      // If there are errors, display them and don't proceed
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setIsLoading(true);
      const data = await createNewAgent(agentType, agentData);
      setIsLoading(false);
      router.push(
        `/${workspaceId}/agent/${data._id}/playground?firstTime=true`
      );
    };

    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-5 text-foreground font-sans">
            Agent Name
          </label>
          <Input
            placeholder="First Last"
            value={agentData.name}
            onChange={(e) => {
              setAgentData({ ...agentData, name: e.target.value });
              // Clear error when user types
              if (errors.name) {
                setErrors({ ...errors, name: null });
              }
            }}
            className={`rounded-md h-10 ${
              errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
            }`}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-5 text-foreground font-sans">
            Language
          </label>
          <Select
            value={agentData.language}
            onValueChange={(value) =>
              setAgentData({ ...agentData, language: value })
            }
          >
            <SelectTrigger className="rounded-md h-10">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="spanish">Spanish</SelectItem>
              <SelectItem value="french">French</SelectItem>
              {/* Add more languages as needed */}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-5 text-foreground font-sans">
            Choose setup
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`flex flex-col items-center justify-center py-4 px-2 border rounded-md cursor-pointer transition-all ${
                agentData.preferredSetupType === "widget"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200"
              }`}
              onClick={() =>
                setAgentData({ ...agentData, preferredSetupType: "widget" })
              }
            >
              <LuMessageSquare className="w-6 h-6 mb-1" />
              <span className="text-center text-sm flex flex-col">
                <span className="font-medium">Website widget</span>
                <span className="text-xs text-gray-500">
                  (Live Call & Chat)
                </span>
              </span>
            </div>
            <div
              className={`flex flex-col items-center justify-center py-4 px-2 border rounded-md cursor-pointer transition-all ${
                agentData.preferredSetupType === "phone"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200"
              }`}
              onClick={() =>
                setAgentData({ ...agentData, preferredSetupType: "phone" })
              }
            >
              <LuPhone className="w-6 h-6 mb-1" />
              <span className="text-center text-sm flex flex-col">
                <span className="font-medium">Phone Agent</span>
                <span className="text-xs text-gray-500">
                  (Calls via Twilio)
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 py-3 px-4 rounded-md gap-4">
          <h3 className="font-medium text-sm">Pro Tips:</h3>
          <p className="text-gray-600 text-sm">
            Create a website widget for live call/chat or connect Twilio.
            Settings changeable later.
          </p>
        </div>

        <LoadingButton
          className="w-full px-3 py-3 bg-[#14141F] text-white rounded-md text-sm font-medium mt-3"
          onClick={handleCreateAgent}
          loading={isLoading}
        >
          Create Agent Now
        </LoadingButton>
      </div>
    );
  };

  return (
    <DialogContent className="sm:w-[400px] max-sm:w-[300px] border border-gray-200 p-0">
      <div className="pt-5 pb-2 px-6">
        <StepIndicator
          steps={["Agent", "Prompt", "Knowledge"]}
          currentStep={0}
        />
        <div className="w-full h-px bg-gray-200 mb-4"></div>
        <CustomDialogHeader
          title={
            !agentType || agentType === "Create agent using AI"
              ? "Create an Agent"
              : `Create a ${agentType}`
          }
          subtitle="Add a new voice agent into your business"
          showSeparator={false}
        />
      </div>
      <div className="px-6 pb-5">
        {agentType ? <CreateAgent agentType={agentType} /> : <AgentTypes />}
      </div>
    </DialogContent>
  );
}
