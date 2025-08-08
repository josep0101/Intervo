import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ToolConfigDialog = ({ isOpen, onClose, onSave, tool }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (tool && tool.requiredFields) {
      // Initialize form data with empty values
      const initialData = {};
      tool.requiredFields.forEach((field) => {
        initialData[field.name] = "";
      });
      setFormData(initialData);
    }
  }, [tool]);

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSave = () => {
    // Validate required fields
    const missingFields = tool.requiredFields?.filter(
      (field) => field.required && !formData[field.name]?.trim()
    );

    if (missingFields?.length > 0) {
      alert(
        `Please fill in all required fields: ${missingFields
          .map((f) => f.label)
          .join(", ")}`
      );
      return;
    }

    // Create the tool configuration in the expected format
    const toolConfig = {
      name: tool.type,
      type: tool.type,
      serverUrl: `http://localhost:${tool.serverPort}`,
      config: formData,
    };

    onSave(toolConfig);
    onClose();
  };

  const handleClose = () => {
    setFormData({});
    onClose();
  };

  if (!tool) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure {tool.name}</DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {tool.requiredFields?.map((field) => (
            <div
              key={field.name}
              className="grid grid-cols-4 items-center gap-4"
            >
              <Label htmlFor={field.name} className="text-right">
                {field.label}
                {field.required && " *"}
              </Label>
              <Input
                id={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name] || ""}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                className="col-span-3"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Tool</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToolConfigDialog;
