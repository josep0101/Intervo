import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mockCalendarTools } from "@/data/mockCalendarTools";

const ToolSelectionDialog = ({ isOpen, onClose, onSelectTool }) => {
  const handleSelectTool = (tool) => {
    onSelectTool(tool);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select a Tool</DialogTitle>
          <DialogDescription>
            Choose a tool to add to your agent&apos;s capabilities
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {mockCalendarTools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 opacity-75"
            >
              <div>
                <h4 className="text-sm font-medium text-gray-600">
                  {tool.name}
                </h4>
                <p className="text-xs text-gray-500">{tool.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Category: {tool.category} | Port: {tool.serverPort}
                </p>
              </div>
              <Button
                disabled
                size="sm"
                variant="outline"
                className="text-gray-500"
              >
                Coming Soon
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToolSelectionDialog;
