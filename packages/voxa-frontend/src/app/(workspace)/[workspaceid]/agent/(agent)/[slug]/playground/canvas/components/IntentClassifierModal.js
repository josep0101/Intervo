"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, ChevronRight, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const IntentClassifierModal = ({
  isOpen,
  onClose,
  classifierData = {},
  onSave,
}) => {
  console.log(classifierData, "classifierData");
  const [formData, setFormData] = useState({
    name: classifierData.name || "New Intent Classifier",
    description:
      classifierData.description ||
      "Click to add a description for your intent classifier",
    classes: classifierData.classes || [],
    threshold: classifierData.threshold || 0.7,
    model: classifierData.model || {
      provider: "openai",
      name: "",
      parameters: {},
    },
  });

  useEffect(() => {
    setFormData({
      ...classifierData,
      name: classifierData.name || "New Intent Classifier",
      description:
        classifierData.description ||
        "Click to add a description for your intent classifier",
    });
  }, [classifierData]);

  const debouncedSave = useCallback(
    (data) => {
      const debouncedFn = debounce((d) => {
        onSave(d);
      }, 1000);
      debouncedFn(data);
    },
    [onSave]
  );

  const handleChange = (field, value) => {
    const newData = {
      ...formData,
      [field]: value,
    };
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
      <DialogContent
        className="fixed top-[30px] !left-auto !right-6 max-h-[calc(100vh-60px)] w-[420px] overflow-y-auto bg-white z-50 shadow-lg border-l border-gray-300 transition-transform transform"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">
            Intent Classifier Settings
          </DialogTitle>
        </DialogHeader>
        <div className="p-2 pb-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 mr-8">
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="text-l font-semibold bg-transparent border-0 p-0 focus-visible:ring-0 h-auto shadow-none outline-none"
                placeholder="Classifier Name"
              />
              <Input
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="text-xs text-muted-foreground resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none outline-none h-[32px] max-h-[32px]"
                placeholder="Add a description"
              />
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="mt-0">
          <div className="space-y-0">
            <Tabs defaultValue="intents" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="intents">Classes</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="intents" className="space-y-4">
                <ClassesList
                  classes={formData.classes}
                  onSave={(updatedClasses) =>
                    handleChange("classes", updatedClasses)
                  }
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <ClassifierSettings
                  settings={{
                    threshold: formData.threshold,
                    model: formData.model,
                  }}
                  onSave={(field, value) => handleChange(field, value)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ClassesList = ({ classes, onSave }) => {
  const handleAddClass = () => {
    const newClass = {
      topic: `When #${classes.length + 1}`,
    };
    onSave([...classes, newClass]);
  };

  const handleDeleteClass = (classToDelete) => {
    const updatedClasses = classes.filter(
      (classItem) => classItem.topic !== classToDelete.topic
    );
    onSave(updatedClasses);
  };

  const handleEditClass = (index, updatedClass) => {
    const updatedClasses = classes.map((classItem, i) =>
      i === index ? updatedClass : classItem
    );
    onSave(updatedClasses);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="text-xs text-muted-foreground">
        Add classes to train your intent classifier.
      </div>

      <ScrollArea className="h-[400px] pr-4">
        {classes.map((classItem, index) => (
          <ClassItem
            key={index}
            classItem={{ ...classItem, index: index + 1 }}
            onEdit={(updatedClass) => handleEditClass(index, updatedClass)}
            onDelete={handleDeleteClass}
          />
        ))}
      </ScrollArea>

      <Button
        type="button"
        onClick={handleAddClass}
        className="flex items-center gap-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs w-full justify-center"
      >
        <Plus size={16} /> Add Class
      </Button>
    </div>
  );
};

const ClassItem = ({ classItem, onEdit, onDelete }) => {
  const [editedClass, setEditedClass] = useState(classItem);

  const handleChange = (value) => {
    const updatedClass = {
      ...editedClass,
      topic: value,
    };
    setEditedClass(updatedClass);
    onEdit(updatedClass);
  };

  return (
    <Card className="mb-3 bg-gray-50 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm font-semibold bg-gray-100 px-2.5 py-1 rounded-md text-gray-700">
            When #{classItem.index}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => onDelete(classItem)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Textarea
          value={editedClass.topic}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Write your topic..."
          className="min-h-[80px] resize-none bg-gray-10 border-0 shadow-none text-sm leading-relaxed placeholder:text-xs placeholder:text-gray-400 focus-visible:ring-0 transition-colors"
        />
      </CardContent>
    </Card>
  );
};

const ClassifierSettings = ({ settings, onSave }) => {
  return (
    <div className="space-y-4 p-4">
      <Card className="border-none shadow-none bg-gray-50">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Confidence Threshold</Label>
              <Input
                type="number"
                value={settings.threshold}
                onChange={(e) =>
                  onSave("threshold", parseFloat(e.target.value))
                }
                min={0}
                max={1}
                step={0.1}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Model Provider</Label>
              <Select
                value={settings.model?.provider}
                onValueChange={(value) =>
                  onSave("model", { ...settings.model, provider: value })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Model Name</Label>
              <Select
                value={settings.model?.name}
                onValueChange={(value) =>
                  onSave("model", { ...settings.model, name: value })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-sonnet">
                    Claude 3 Sonnet
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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

export default IntentClassifierModal;
