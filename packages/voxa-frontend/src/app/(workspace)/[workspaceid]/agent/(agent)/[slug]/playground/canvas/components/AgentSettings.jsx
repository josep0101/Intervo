"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const AgentSettings = ({ agentData = {}, onSave }) => {
  // Local state to track form values
  const [localSettings, setLocalSettings] = useState(agentData);

  // Update local state ONLY when agentData._id changes (when a different node is selected)
  useEffect(() => {
    setLocalSettings(agentData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentData?.id]); // Only depend on the ID, not the entire agentData

  // Debounced save function
  const debouncedSave = useCallback(
    (field, value) => {
      const debouncedFn = debounce((f, v) => {
        onSave(f, v);
      }, 1000);
      debouncedFn(field, value);
    },
    [onSave]
  );

  const handlePolicyChange = (field, value) => {
    const newSettings = {
      ...localSettings,
      policies: {
        ...localSettings.policies,
        [field]: value,
      },
    };
    setLocalSettings(newSettings);
    debouncedSave("policies", newSettings.policies);
  };

  const handleLLMChange = (field, value) => {
    const newSettings = {
      ...localSettings,
      llm: {
        ...localSettings.llm,
        [field]: value,
      },
    };
    setLocalSettings(newSettings);
    debouncedSave("llm", newSettings.llm);
  };

  const [parametersText, setParametersText] = useState(
    localSettings?.llm?.parameters
      ? JSON.stringify(localSettings.llm.parameters, null, 2)
      : ""
  );

  useEffect(() => {
    setParametersText(
      localSettings?.llm?.parameters
        ? JSON.stringify(localSettings.llm.parameters, null, 2)
        : ""
    );
  }, [localSettings?.llm?.parameters]);

  const handleLLMParametersChange = (text) => {
    setParametersText(text);
    try {
      const parsed = JSON.parse(text);
      const newSettings = {
        ...localSettings,
        llm: {
          ...localSettings.llm,
          parameters: parsed,
        },
      };
      setLocalSettings(newSettings);
      debouncedSave("llm", newSettings.llm);
    } catch (error) {
      // Allow invalid JSON while typing
      console.log("Invalid JSON - waiting for valid input");
    }
  };

  return (
    <Accordion
      type="multiple"
      defaultValue={["policies", "llm"]}
      className="w-full"
    >
      {/* Policies */}
      <AccordionItem value="policies">
        <AccordionTrigger className="text-l font-semibold">
          Policies
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <Card className="border-none shadow-none bg-gray-50">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="policy_tone"
                    checked={localSettings?.policies?.tone === "friendly"}
                    onCheckedChange={(checked) =>
                      handlePolicyChange(
                        "tone",
                        checked ? "friendly" : "neutral"
                      )
                    }
                  />
                  <Label htmlFor="policy_tone">Friendly Tone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="policy_language"
                    checked={localSettings?.policies?.language === "en-US"}
                    onCheckedChange={(checked) =>
                      handlePolicyChange("language", checked ? "en-US" : "en")
                    }
                  />
                  <Label htmlFor="policy_language">
                    Language: English (US)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>

      {/* LLM Settings */}
      <AccordionItem value="llm">
        <AccordionTrigger className="text-l font-semibold">
          LLM Settings
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <Card className="border-none shadow-none bg-gray-50">
            <CardContent className="p-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>LLM Provider</Label>
                  <Select
                    value={localSettings?.llm?.provider || ""}
                    onValueChange={(value) =>
                      handleLLMChange("provider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select LLM Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="llm_model">LLM Model</Label>
                  <Input
                    id="llm_model"
                    value={localSettings?.llm?.model || ""}
                    onChange={(e) => handleLLMChange("model", e.target.value)}
                    placeholder="e.g., GPT-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="llm_parameters">LLM Parameters</Label>
                  <Textarea
                    id="llm_parameters"
                    value={parametersText}
                    onChange={(e) => handleLLMParametersChange(e.target.value)}
                    placeholder='{ "temperature": 0.7 }'
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default AgentSettings;
