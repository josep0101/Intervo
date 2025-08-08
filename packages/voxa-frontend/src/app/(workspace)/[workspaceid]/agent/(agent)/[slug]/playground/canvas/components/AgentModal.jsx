"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Edit3, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentCapabilities from "./AgentCapabilities";
import AgentSettings from "./AgentSettings";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const AgentModal = ({
  isOpen,
  onClose,
  agentData = {},
  onSave,
  onDelete,
  selectedNode,
}) => {
  console.log(typeof agentData, "agentData");
  const [formData, setFormData] = useState({
    name: agentData.name || "New Agent",
    description:
      agentData.description || "Click to add a description for your agent",
  });

  // State for when-user-asks functionality
  const [selectedTopics, setSelectedTopics] = useState([]);

  // Predefined topics for when-user-asks nodes
  const predefinedTopics = [
    "Pricing",
    "Booking",
    "Support",
    "Features",
    "Billing",
    "Account",
    "Technical Issues",
    "Refunds",
    "Cancellation",
    "Product Info",
    "Availability",
    "Shipping",
  ];

  // Check if this is a when-user-asks node
  const isWhenUserAsksNode =
    selectedNode?.id?.includes("when-user-ask") ||
    selectedNode?.data?.label === "When user asks";

  // Check if this is a greeting-agent or structured-agent node
  const isAgentNode =
    selectedNode?.id?.includes("greeting-agent") ||
    selectedNode?.id?.includes("Structured-Agent") ||
    selectedNode?.type === "agentNode";

  // Check if this is a start-with or end-with node
  const isStartEndNode =
    selectedNode?.id?.includes("start-with") ||
    selectedNode?.id?.includes("end-with") ||
    selectedNode?.data?.label === "Start with" ||
    selectedNode?.data?.label === "End with";

  useEffect(() => {
    console.log("agentData changed:", agentData);
    setFormData({
      ...agentData,
      name: agentData.name || "New Agent",
      description:
        agentData.description || "Click to add a description for your agent",
    });

    // Initialize when-user-asks state
    if (isWhenUserAsksNode) {
      const existingTopics = agentData.selectedTopics || [];
      setSelectedTopics(existingTopics);
    }
  }, [agentData, isWhenUserAsksNode]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((data) => onSave(data), 1000),
    [onSave]
  );

  const handleChange = (field, value) => {
    console.log("handleChange called:", {
      field,
      value,
      currentFormData: formData,
    });
    const newData = {
      ...formData,
      [field]: value,
    };
    console.log("newData:", newData);
    setFormData(newData);
    debouncedSave(newData);
  };

  const handleTopicToggle = (topic) => {
    const newTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter((t) => t !== topic)
      : [...selectedTopics, topic];

    setSelectedTopics(newTopics);
    const newData = { ...formData, selectedTopics: newTopics };
    setFormData(newData);
    debouncedSave(newData);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      modal={false}
    >
      {isOpen && (
        <div className="fixed top-16 left-0 right-0 bottom-0 backdrop-blur-sm z-40" />
      )}

      <DialogContent
        className="fixed top-20 !left-auto !right-6 flex flex-col gap-4 min-h-[calc(100vh-6rem)] w-[512px] overflow-y-auto bg-white z-50 shadow-lg border-l border-gray-300 transition-transform transform"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <DialogHeader className="absolute top-0 right-0">
          <DialogTitle className="sr-only">Agent Settings</DialogTitle>
        </DialogHeader>
        <div className="p-2 pb-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                {isWhenUserAsksNode ? (
                  <h2 className="text-lg font-semibold text-gray-900">
                    When user asks about
                  </h2>
                ) : isStartEndNode ? (
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedNode?.data?.label ||
                      selectedNode?.data?.name ||
                      "Node"}
                  </h2>
                ) : (
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-medium text-gray-700">
                      Title
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="text-xs font-medium"
                      placeholder="Agent Name"
                    />
                  </div>
                )}
              </div>
              {!isWhenUserAsksNode && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Prompt
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                    className="text-xs resize-none min-h-[72px] rounded-md"
                    placeholder={
                      isAgentNode
                        ? "Prompt for the subagent"
                        : "Add a description"
                    }
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/200 characters
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simple topic selection for when-user-asks nodes */}
        {isWhenUserAsksNode && (
          <div className="px-2 py-2 space-y-3">
            <div className="space-y-3">
              {/* Selected Topics - moved to top */}
              {selectedTopics.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">
                    Selected topics:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTopics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="bg-gray-800 text-white hover:bg-gray-700 cursor-pointer transition-colors px-3 py-1"
                        onClick={() => handleTopicToggle(topic)}
                      >
                        {topic} <span className="ml-1 text-gray-300">×</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Helper text */}
              <p className="text-xs text-gray-600 pt-2">
                Select any topic from the list below or type your own to specify
                what should trigger this response.
              </p>

              {/* Topic Input */}
              <div className="space-y-3">
                <Input
                  placeholder="Type a custom topic..."
                  className="h-9 text-sm placeholder:text-xs placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      const newTopic = e.target.value.trim();
                      if (!selectedTopics.includes(newTopic)) {
                        handleTopicToggle(newTopic);
                      }
                      e.target.value = "";
                    }
                  }}
                />

                {/* Predefined Topics */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-700">
                    Quick select:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {predefinedTopics
                      .filter((topic) => !selectedTopics.includes(topic))
                      .map((topic) => (
                        <Badge
                          key={topic}
                          variant="outline"
                          className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer transition-colors px-3 py-1"
                          onClick={() => handleTopicToggle(topic)}
                        >
                          {topic}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {agentData.type !== "classItem" && (
          <div className="mt-0">
            <div className="space-y-0">
              <Tabs defaultValue="preferences" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="preferences" className="space-y-4">
                  <AgentCapabilities
                    agentData={agentData}
                    onSave={(updatedCapabilities) => {
                      Object.entries(updatedCapabilities).forEach(
                        ([field, value]) => {
                          handleChange(field, value);
                        }
                      );
                    }}
                  />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <AgentSettings
                    agentData={agentData}
                    onSave={(field, value) => handleChange(field, value)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
        {onDelete && (
          <div className="p-2 pt-0 mt-auto">
            <Button
              onClick={() => onDelete(selectedNode?.id || agentData.id)}
              variant="destructive"
              className="w-full"
            >
              Delete Node
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

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

export default AgentModal;
