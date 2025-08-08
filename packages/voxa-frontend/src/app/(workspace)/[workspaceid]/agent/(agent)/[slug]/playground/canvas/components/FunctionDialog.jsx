import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FunctionDialog = ({ isOpen, onClose, onSave, func = null }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    api_endpoint: "",
    method: "GET",
    headers: "",
    parameters: "",
    response_mapping: "",
  });

  useEffect(() => {
    if (func) {
      setFormData({
        name: func.name || "",
        description: func.description || "",
        api_endpoint: func.api_endpoint || "",
        method: func.method || "GET",
        headers: func.headers ? JSON.stringify(func.headers, null, 2) : "",
        parameters: func.parameters
          ? JSON.stringify(func.parameters, null, 2)
          : "",
        response_mapping: func.response_mapping
          ? JSON.stringify(func.response_mapping, null, 2)
          : "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        api_endpoint: "",
        method: "GET",
        headers: "",
        parameters: "",
        response_mapping: "",
      });
    }
  }, [func]);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const processedData = {
        ...formData,
        headers: formData.headers ? JSON.parse(formData.headers) : {},
        parameters: formData.parameters ? JSON.parse(formData.parameters) : {},
        response_mapping: formData.response_mapping
          ? JSON.parse(formData.response_mapping)
          : {},
      };
      onSave(processedData);
      onClose();
    } catch (error) {
      console.error("Error parsing JSON:", error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{func ? "Edit Function" : "Add Function"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Function Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., get_weather"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this function does..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_endpoint">API Endpoint</Label>
              <Input
                id="api_endpoint"
                value={formData.api_endpoint}
                onChange={(e) =>
                  setFormData({ ...formData, api_endpoint: e.target.value })
                }
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <Select
                value={formData.method}
                onValueChange={(value) =>
                  setFormData({ ...formData, method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={formData.headers}
                onChange={(e) =>
                  setFormData({ ...formData, headers: e.target.value })
                }
                placeholder='{"Authorization": "Bearer token"}'
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parameters">Parameters (JSON)</Label>
              <Textarea
                id="parameters"
                value={formData.parameters}
                onChange={(e) =>
                  setFormData({ ...formData, parameters: e.target.value })
                }
                placeholder='{"param1": "value1", "param2": "value2"}'
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response_mapping">Response Mapping (JSON)</Label>
              <Textarea
                id="response_mapping"
                value={formData.response_mapping}
                onChange={(e) =>
                  setFormData({ ...formData, response_mapping: e.target.value })
                }
                placeholder='{"response_field": "mapped_field"}'
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FunctionDialog;
