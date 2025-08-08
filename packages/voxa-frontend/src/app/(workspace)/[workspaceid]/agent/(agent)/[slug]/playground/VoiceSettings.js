import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlayground } from "@/context/AgentContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AIConfigForm() {
  const [isOpen, setIsOpen] = useState(false);
  const { setAIConfig, aiConfig = {}, updateAIConfig } = usePlayground();

  // Add this single ref to track updates
  const isUpdating = useRef(false);

  const [formState, setFormState] = useState(aiConfig);

  // Define voiceSettings array once as a constant for reuse
  const voiceSettings = [
    "sttSettings",
    "ttsSettings",
    "introduction",
    "agentType",
    "callDirection",
  ];

  useEffect(() => {
    const savedConfig = aiConfig;
    if (savedConfig) {
      setFormState(savedConfig);
    }
  }, [aiConfig]);

  // Add a new useEffect to update formState when aiConfig changes
  useEffect(() => {
    console.log(aiConfig, "aiConfig in voice settings");
    // Skip if we're already in the middle of an update to prevent loops
    if (isUpdating.current) return;

    // Check if any of the relevant keys in aiConfig have changed
    const needsUpdate = voiceSettings.some((key) => {
      console.log(
        aiConfig[key],
        formState[key],
        "aiConfig[key], formState[key]"
      );
      // First, handle cases where either value might be undefined
      if (!aiConfig[key] && !formState[key]) return false;
      if (!aiConfig[key] || !formState[key]) return true;

      // Now we know both values exist, check based on type
      if (key === "sttSettings" || key === "ttsSettings") {
        // These are objects, so use deep comparison
        return JSON.stringify(aiConfig[key]) !== JSON.stringify(formState[key]);
      } else {
        // These are primitive values (strings, etc.), use simple comparison
        return aiConfig[key] !== formState[key];
      }
    });

    if (needsUpdate) {
      // Set the updating flag to prevent the other useEffect from reacting
      isUpdating.current = true;

      // Create a new object with only the needed properties from aiConfig
      const updatedSettings = {};
      voiceSettings.forEach((key) => {
        if (aiConfig[key] !== undefined) {
          updatedSettings[key] = aiConfig[key];
        }
      });

      // Update formState with the new settings
      setFormState((prevState) => ({
        ...prevState,
        ...updatedSettings,
      }));

      // Reset the flag after React processes the update
      setTimeout(() => {
        isUpdating.current = false;
      }, 0);
    }
  }, [aiConfig]);

  useEffect(() => {
    // Skip if we're already in the middle of an update to prevent loops
    if (isUpdating.current) return;

    const currentSettings = Object.fromEntries(
      voiceSettings.map((key) => [key, formState[key]])
    );

    const prevSettings = Object.fromEntries(
      voiceSettings.map((key) => [key, aiConfig[key]])
    );

    // Compare the extracted settings
    if (
      formState.sttService !== aiConfig.sttService ||
      formState.ttsService !== aiConfig.ttsService ||
      formState.introduction !== aiConfig.introduction ||
      formState.agentType !== aiConfig.agentType ||
      formState.callDirection !== aiConfig.callDirection
    ) {
      console.log(currentSettings, aiConfig);

      // When you uncomment this line, the isUpdating ref will prevent infinite loops
      isUpdating.current = true;
      setAIConfig({ ...aiConfig, ...currentSettings });

      // Reset the flag after React processes the update
      setTimeout(() => {
        isUpdating.current = false;
      }, 0);
    }
  }, [formState, aiConfig, setAIConfig]);

  const handleSelectChange = (value, field) => {
    if (field === "ttsSettings.service" || field === "sttSettings.service") {
      const [parent, child] = field.split(".");
      setFormState((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
      if (parent == "ttsSettings") {
        updateAIConfig({
          [parent]: {
            [child]: value,
          },
        });
      } else {
        console.log(aiConfig.sttSettings.rawTranscriptionMode);
        updateAIConfig({
          [parent]: {
            rawTranscriptionMode: aiConfig.sttSettings.rawTranscriptionMode,
            [child]: value,
          },
        });
      }
    } else {
      updateAIConfig({
        [parent]: field,
      });
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
    console.log(formState);
  };

  const [agentType, setAgentType] = useState("leadQualification");

  const handleAgentTypeChange = (type) => {
    setAgentType(type);
    updateAIConfig({
      agentType: type,
    });
  };

  // Handle introduction changes with debounce
  const introductionRef = useRef(formState?.introduction || "");
  const introductionTimeoutRef = useRef(null);

  const handleIntroductionChange = (e) => {
    const newValue = e.target.value;
    // Update form state immediately for UI responsiveness
    setFormState((prev) => ({ ...prev, introduction: newValue }));

    // Clear any existing timeout
    if (introductionTimeoutRef.current) {
      clearTimeout(introductionTimeoutRef.current);
    }

    // Set a new timeout for the API update
    introductionTimeoutRef.current = setTimeout(() => {
      // Only update if the value is different from what's in aiConfig
      if (newValue !== aiConfig?.introduction) {
        updateAIConfig({ introduction: newValue });
      }
    }, 500);
  };

  // Rules management
  const [rules, setRules] = useState(formState?.rules || []);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState("");
  const rulesTimeoutRef = useRef(null);

  const handleAddRule = () => {
    if (newRule.trim()) {
      const updatedRules = [...rules, newRule.trim()];
      setRules(updatedRules);
      setNewRule("");
      updateRulesWithDebounce(updatedRules);
    }
  };

  const handleRemoveRule = (index) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    updateRulesWithDebounce(updatedRules);
  };

  const updateRulesWithDebounce = (updatedRules) => {
    // Update form state immediately
    setFormState((prev) => ({ ...prev, rules: updatedRules }));

    // Clear any existing timeout
    if (rulesTimeoutRef.current) {
      clearTimeout(rulesTimeoutRef.current);
    }

    // Set a new timeout for the API update
    rulesTimeoutRef.current = setTimeout(() => {
      updateAIConfig({ rules: updatedRules });
    }, 500);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (introductionTimeoutRef.current) {
        clearTimeout(introductionTimeoutRef.current);
      }
      if (rulesTimeoutRef.current) {
        clearTimeout(rulesTimeoutRef.current);
      }
    };
  }, []);

  const sttOptions = [
    {
      value: "Google Speech-to-Text",
      label: "Google Speech-to-Text (Recommended)",
    },
    { value: "Assembly AI", label: "Assembly AI" },
    {
      value: "Azure Speech Services",
      label: "Azure Speech Services",
    },
    { value: "Deepgram", label: "Deepgram" },
  ];

  const ttsOptions = [
    {
      value: "Azure Speech Services",
      label: "Azure Speech Services (Recommended)",
    },
    { value: "ElevenLabs", label: "ElevenLabs (Recommended)" },
    { value: "Google Cloud TTS", label: "Google Cloud TTS (Working)" },
    { value: "Amazon Polly", label: "Amazon Polly (In Progress)" },
  ];

  return (
    <Card className="p-6 space-y-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" />
        <span className="text-md font-semibold">Speech & Text</span>
      </div>
      <Separator />
      {/* Speech to Text Selection */}
      <div className="space-y-2">
        <Label className="font-semibold">Speech to Text Service</Label>
        <Select
          value={formState?.sttSettings?.service}
          onValueChange={(value) =>
            handleSelectChange(value, "sttSettings.service")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select STT service" />
          </SelectTrigger>
          <SelectContent>
            {sttOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Agent Type Selection */}
      <div className="space-y-2">
        <Label className="font-semibold">Agent Type</Label>
        <Select value={agentType} onValueChange={handleAgentTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Agent Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="leadQualification">
              Lead Qualification
            </SelectItem>
            <SelectItem value="salesAgent">Sales Agent</SelectItem>
            <SelectItem value="customerSupport">
              Customer Support Agent
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="space-y-2 mt-4">
          <Label className="font-semibold">Introduction</Label>
          <Textarea
            rows={4}
            value={formState.introduction || ""}
            onChange={handleIntroductionChange}
            placeholder="Enter your introduction here..."
          />
        </div>
      </div>

      {/* Rules Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">Rules</Label>
          <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Rules</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a new rule..."
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddRule()}
                  />
                  <Button onClick={handleAddRule} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {rules.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-gray-50 rounded-md"
                    >
                      <span className="flex-1 text-sm">{rule}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                        onClick={() => handleRemoveRule(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {rules.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No rules added yet
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rules Preview */}
        <div className="space-y-1">
          {rules.slice(0, 2).map((rule, index) => (
            <div
              key={index}
              className="text-sm text-gray-800 bg-gray-50 p-2 rounded-md"
            >
              {rule}
            </div>
          ))}
          {rules.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setRulesDialogOpen(true)}
            >
              +{rules.length - 2} more...
            </Button>
          )}
          {rules.length === 0 && (
            <p className="text-sm text-gray-400 italic">No rules added</p>
          )}
        </div>
      </div>
    </Card>
  );
}
