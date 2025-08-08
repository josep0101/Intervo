"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const CustomizeWidgetForm = ({ aiConfig, configureWidget }) => {
  // Helper function to get initial config from aiConfig or use defaults
  const getInitialConfig = () => {
    const defaultConfig = {
      color: "#111111",
      position: "bottom-right",
      startingMessage: "Hey how can i help you",
      aiVoiceCall: true,
      aiChat: true,
      contactMethod: {
        enabled: true,
        type: "email",
        value: "user@email.com",
      },
    };

    if (!aiConfig?.widgetConfiguration) {
      return defaultConfig;
    }

    const saved = aiConfig.widgetConfiguration;
    return {
      color: saved.appearance?.color || defaultConfig.color,
      position: saved.appearance?.position || defaultConfig.position,
      startingMessage:
        saved.behavior?.startingMessage || defaultConfig.startingMessage,
      aiVoiceCall:
        saved.behavior?.features?.aiVoiceCall ?? defaultConfig.aiVoiceCall,
      aiChat: saved.behavior?.features?.aiChat ?? defaultConfig.aiChat,
      contactMethod: {
        enabled:
          saved.contactMethod?.enabled ?? defaultConfig.contactMethod.enabled,
        type: saved.contactMethod?.type || defaultConfig.contactMethod.type,
        value: saved.contactMethod?.value || defaultConfig.contactMethod.value,
      },
    };
  };

  const [widgetConfig, setWidgetConfig] = useState(getInitialConfig);
  const [isSaving, setIsSaving] = useState(false);

  // Update widgetConfig when aiConfig changes
  useEffect(() => {
    setWidgetConfig(getInitialConfig());
  }, [aiConfig?.widgetConfiguration]);

  // Trigger an initial "settle" render to prevent first-click scroll issue
  useEffect(() => {
    // Force a tiny state update on mount to settle the layout
    const timer = setTimeout(() => {
      setWidgetConfig((prev) => ({ ...prev }));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const contactMethodOptions = [
    { value: "email", label: "Email us", placeholder: "user@email.com" },
    { value: "whatsapp", label: "WhatsApp", placeholder: "+1234567890" },
    { value: "phone", label: "Call us", placeholder: "+1234567890" },
    { value: "sms", label: "Text us", placeholder: "+1234567890" },
  ];

  const handleConfigChange = (field, value) => {
    setWidgetConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleContactMethodChange = (field, value) => {
    setWidgetConfig((prev) => ({
      ...prev,
      contactMethod: {
        ...prev.contactMethod,
        [field]: value,
      },
    }));
  };

  const getContactMethodPlaceholder = () => {
    const method = contactMethodOptions.find(
      (option) => option.value === widgetConfig.contactMethod.type
    );
    return method ? method.placeholder : "";
  };

  // const getContactMethodLabel = () => { // This function doesn't seem to be used, can be removed or kept if planned for future
  //   const method = contactMethodOptions.find(
  //     (option) => option.value === widgetConfig.contactMethod.type
  //   );
  //   return method ? method.label : "Contact";
  // };

  const handleSaveAndPublish = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!aiConfig?._id) {
      console.error("No agent ID available for saving widget configuration");
      return;
    }

    setIsSaving(true);

    const widgetConfiguration = {
      appearance: {
        color: widgetConfig.color,
        position: widgetConfig.position,
      },
      behavior: {
        startingMessage: widgetConfig.startingMessage,
        features: {
          aiVoiceCall: widgetConfig.aiVoiceCall,
          aiChat: widgetConfig.aiChat,
        },
      },
      contactMethod: {
        enabled: widgetConfig.contactMethod.enabled,
        type: widgetConfig.contactMethod.type,
        value: widgetConfig.contactMethod.value,
      },
    };

    console.log(
      "Saving widget configuration from CustomizeWidgetForm:",
      widgetConfiguration
    );

    try {
      const result = await configureWidget(aiConfig._id, widgetConfiguration);
      if (result.error) {
        console.error("Failed to save widget configuration:", result.error);
        // You can add user notification here
      } else {
        console.log("Widget configuration saved successfully");
        // You can add success notification here
      }
    } catch (error) {
      console.error("Error saving widget configuration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <p className="font-medium text-foreground leading-6 font-sans">
        Customize Widget
      </p>

      {/* Choose Color */}
      <div className="space-y-2">
        <Label htmlFor="color-custom" className="text-sm font-medium">
          {" "}
          {/* Changed htmlFor to avoid conflict if main page has 'color' id */}
          Choose color
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="color-custom" // Changed id
            type="color"
            value={widgetConfig.color}
            onChange={(e) => handleConfigChange("color", e.target.value)}
            className="w-16 h-10 rounded cursor-pointer border-0 p-1"
          />
          <Input
            type="text"
            aria-label="Color hex value"
            value={widgetConfig.color}
            onChange={(e) => handleConfigChange("color", e.target.value)}
            className="flex-1"
            placeholder="#111111"
          />
        </div>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <Label htmlFor="position-custom" className="text-sm font-medium">
          Position
        </Label>{" "}
        {/* Added htmlFor */}
        <Select
          value={widgetConfig.position}
          onValueChange={(value) => handleConfigChange("position", value)}
        >
          <SelectTrigger id="position-custom" className="w-full">
            {" "}
            {/* Added id and w-full for better layout */}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bottom-left">Bottom Left</SelectItem>
            <SelectItem value="bottom-right">Bottom Right</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Starting Message */}
      <div className="space-y-2">
        <Label htmlFor="startingMessage-custom" className="text-sm font-medium">
          Starting Message
        </Label>
        <Input
          id="startingMessage-custom" // Changed id
          value={widgetConfig.startingMessage}
          onChange={(e) =>
            handleConfigChange("startingMessage", e.target.value)
          }
          placeholder="Hey how can i help you"
        />
      </div>

      {/* Select what you need in widget */}
      <div className="space-y-4">
        <Label className="text-sm font-medium block mb-2">
          {" "}
          {/* Made block and added margin for better spacing */}
          Select what you need in widget
        </Label>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="aiVoiceCall-custom" // Changed id
              checked={widgetConfig.aiVoiceCall}
              onCheckedChange={(checked) => {
                handleConfigChange("aiVoiceCall", checked);
              }}
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            <Label htmlFor="aiVoiceCall-custom" className="text-sm font-medium">
              AI Voice Call
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="aiChat-custom" // Changed id
              checked={widgetConfig.aiChat}
              onCheckedChange={(checked) => {
                handleConfigChange("aiChat", checked);
              }}
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            <Label htmlFor="aiChat-custom" className="text-sm font-medium">
              AI Chat
            </Label>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="contactMethod-enabled-custom" // Changed id
                checked={widgetConfig.contactMethod.enabled}
                onCheckedChange={(checked) => {
                  handleContactMethodChange("enabled", checked);
                }}
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Label
                htmlFor="contactMethod-enabled-custom"
                className="text-sm font-medium sr-only"
              >
                Enable Contact Method
              </Label>{" "}
              <span
                id="contactMethod-type-label"
                className="text-sm font-medium ml-2"
              >
                {" "}
                {/* Added label for Select */}
                Contact Via
              </span>
              {/* Added sr-only label for accessibility */}
              <Select
                value={widgetConfig.contactMethod.type}
                onValueChange={(value) => {
                  handleContactMethodChange("type", value);
                }}
                disabled={!widgetConfig.contactMethod.enabled}
                aria-labelledby="contactMethod-type-label" // For accessibility
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {widgetConfig.contactMethod.enabled && (
              <div className="space-y-2 pl-6">
                {" "}
                {/* Matched pl-6 from original CustomizeWidget for consistency */}
                <Label htmlFor="contactMethod-value-custom" className="sr-only">
                  Contact Value
                </Label>{" "}
                {/* Added sr-only label for accessibility */}
                <Input
                  id="contactMethod-value-custom" // Changed id
                  value={widgetConfig.contactMethod.value}
                  onChange={(e) =>
                    handleContactMethodChange("value", e.target.value)
                  }
                  placeholder={getContactMethodPlaceholder()}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  This {widgetConfig.contactMethod.type} will be the user
                  contact method
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        onClick={handleSaveAndPublish}
        className="flex justify-end items-center gap-1 px-4 py-2 bg-primary hover:bg-primary/90 text-sm leading-6 font-medium font-sans text-primary-foreground rounded-md"
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : "Save & Publish Now"}
      </Button>
    </div>
  );
};

export default CustomizeWidgetForm;
