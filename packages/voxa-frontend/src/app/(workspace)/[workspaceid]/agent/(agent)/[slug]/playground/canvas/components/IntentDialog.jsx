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
import { ChevronDown, ChevronUp } from "lucide-react";

const IntentDialog = ({ isOpen, onClose, onSave, intent = null }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    required_entities: "",
    optional_entities: "",
    response_policy: "",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (intent) {
      setFormData({
        name: intent.name || "",
        description: intent.description || "",
        required_entities: intent.required_entities?.join(", ") || "",
        optional_entities: intent.optional_entities?.join(", ") || "",
        response_policy: intent.response_policy || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        required_entities: "",
        optional_entities: "",
        response_policy: "",
      });
    }
  }, [intent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      required_entities: formData.required_entities
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
      optional_entities: formData.optional_entities
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{intent ? "Edit Goal" : "Add Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Collect user contact information"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">What should the agent do?</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what information to collect or what action to take..."
                rows={3}
              />
            </div>

            {/* Advanced Section */}
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 p-0 h-auto text-sm text-gray-600 hover:text-gray-900"
              >
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Advanced Settings
              </Button>

              {showAdvanced && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="required_entities">
                      Required Information
                    </Label>
                    <Input
                      id="required_entities"
                      value={formData.required_entities}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          required_entities: e.target.value,
                        })
                      }
                      placeholder="name, email, phone (comma separated)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="optional_entities">
                      Optional Information
                    </Label>
                    <Input
                      id="optional_entities"
                      value={formData.optional_entities}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          optional_entities: e.target.value,
                        })
                      }
                      placeholder="company, preferences (comma separated)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="response_policy">
                      Response Instructions
                    </Label>
                    <Textarea
                      id="response_policy"
                      value={formData.response_policy}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          response_policy: e.target.value,
                        })
                      }
                      placeholder="Specific instructions for how the agent should respond..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Goal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IntentDialog;
