"use client";

import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import KnowledgeBaseSelect from "./KnowledgeBaseSelect";
import IntentDialog from "./IntentDialog";
import IntentItem from "./IntentItem";
import FunctionDialog from "./FunctionDialog";
import FunctionItem from "./FunctionItem";
import { Card, CardContent } from "@/components/ui/card";
import { usePlayground } from "@/context/AgentContext";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AgentCapabilities = ({ agentData, onSave }) => {
  const [intents, setIntents] = useState(agentData?.intents || []);
  const [functions, setFunctions] = useState(agentData?.functions || []);

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    intent: null,
  });

  const [functionDialogState, setFunctionDialogState] = useState({
    isOpen: false,
    func: null,
  });

  const { tools, fetchTools, aiConfig } = usePlayground();
  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => {
    if (agentData?.intents) {
      setIntents(agentData.intents);
    }
    if (agentData?.functions) {
      setFunctions(agentData.functions);
    }
    if (agentData?.tools && agentData.tools.length > 0) {
      const initialTool = tools?.find(
        (tool) => tool._id === agentData.tools[0]
      );
      setSelectedTool(initialTool || null);
    }
  }, [agentData, tools]);

  useEffect(() => {
    console.log("fetching tools");
    fetchTools();
    return () => {
      console.log("unmounting tools");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddIntent = () => {
    setDialogState({ isOpen: true, intent: null });
  };

  const handleEditIntent = (intent) => {
    setDialogState({ isOpen: true, intent });
  };

  const handleDeleteIntent = async (intentToDelete) => {
    try {
      const updatedIntents = intents.filter(
        (intent) => intent.name !== intentToDelete.name
      );

      // Save to backend
      const response = await fetch("/api/agents/intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: agentData.id,
          intents: updatedIntents,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete intent");
      }

      setIntents(updatedIntents);
      onSave({ intents: updatedIntents });
    } catch (error) {
      console.error("Error deleting intent:", error);
    }
  };

  const handleSaveIntent = async (intentData) => {
    try {
      let updatedIntents;
      if (dialogState.intent) {
        updatedIntents = intents.map((intent) =>
          intent.name === dialogState.intent.name ? intentData : intent
        );
      } else {
        updatedIntents = [...intents, intentData];
      }

      setIntents(updatedIntents);
      onSave({ intents: updatedIntents });
    } catch (error) {
      console.error("Error saving intent:", error);
    }
  };

  const handleAddFunction = () => {
    setFunctionDialogState({ isOpen: true, func: null });
  };

  const handleEditFunction = (func) => {
    setFunctionDialogState({ isOpen: true, func });
  };

  const handleDeleteFunction = async (funcToDelete) => {
    try {
      const updatedFunctions = functions.filter(
        (func) => func.name !== funcToDelete.name
      );

      // Save to backend
      const response = await fetch("/api/agents/functions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: agentData.id,
          functions: updatedFunctions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete function");
      }

      setFunctions(updatedFunctions);
      onSave({ functions: updatedFunctions });
    } catch (error) {
      console.error("Error deleting function:", error);
    }
  };

  const handleSaveFunction = async (functionData) => {
    try {
      let updatedFunctions;
      if (functionDialogState.func) {
        updatedFunctions = functions.map((func) =>
          func.name === functionDialogState.func.name ? functionData : func
        );
      } else {
        updatedFunctions = [...functions, functionData];
      }

      setFunctions(updatedFunctions);
      onSave({ functions: updatedFunctions });
    } catch (error) {
      console.error("Error saving function:", error);
    }
  };

  const handleKnowledgeBaseChange = (enabled) => {
    if (enabled && aiConfig?.knowledgeBase?.sources?.length > 0) {
      // If enabling and agent has knowledge base sources, use them
      onSave({
        knowledgeBase: {
          sources: aiConfig.knowledgeBase.sources,
        },
      });
    } else {
      // If disabling or no sources available, set to empty array
      onSave({
        knowledgeBase: {
          sources: [],
        },
      });
    }
  };

  const handleToolChange = (value) => {
    console.log("Raw value received:", value);

    if (value === "remove") {
      setSelectedTool(null);
      onSave({
        tools: [],
      });
      return;
    }

    const selected = tools?.find((tool) => tool._id === value);
    console.log("Selected tool:", selected);

    if (selected) {
      setSelectedTool(selected);
      onSave({
        tools: [selected._id],
      });
    }
  };
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Knowledge Base Toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-gray-900">
            Enable Knowledge Base
          </h3>
          <p className="text-xs text-gray-600">
            Connect knowledge base to help answer questions
          </p>
        </div>
        <Switch
          checked={agentData?.knowledgeBase?.sources?.length > 0}
          onCheckedChange={handleKnowledgeBaseChange}
        />
      </div>

      {/* Goals Section */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="space-y-1 flex-1">
          <h3 className="text-xs font-medium text-gray-900">
            Goals of the agent
          </h3>
          <p className="text-xs text-gray-600">
            Goals are what info that needs to be collected by the subagent
          </p>
          {intents.length === 0 && (
            <p className="text-xs text-gray-500 italic">No goals defined yet</p>
          )}
          {intents.length > 0 && (
            <div className="space-y-2 mt-2">
              {intents.map((intent) => (
                <IntentItem
                  key={intent.name}
                  intent={intent}
                  onEdit={handleEditIntent}
                  onDelete={handleDeleteIntent}
                />
              ))}
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={handleAddIntent}
          size="sm"
          variant="outline"
          className="text-xs ml-3"
        >
          Add Goal
        </Button>
      </div>

      {/* Functions Section */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="space-y-1 flex-1">
          <h3 className="text-xs font-medium text-gray-900">Functions</h3>
          <p className="text-xs text-gray-600">
            Add functions to extend the agent&apos;s capabilities
          </p>
          {!selectedTool && (
            <p className="text-xs text-gray-500 italic">
              No functions added yet
            </p>
          )}
          {selectedTool && (
            <div className="text-xs text-gray-700 mt-2">
              {selectedTool.name}
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={() => {
            /* We'll define this later */
          }}
          size="sm"
          variant="outline"
          className="text-xs ml-3"
        >
          Add Function
        </Button>
      </div>

      <IntentDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState({ isOpen: false, intent: null })}
        onSave={handleSaveIntent}
        intent={dialogState.intent}
      />
    </div>
  );
};

export default AgentCapabilities;
