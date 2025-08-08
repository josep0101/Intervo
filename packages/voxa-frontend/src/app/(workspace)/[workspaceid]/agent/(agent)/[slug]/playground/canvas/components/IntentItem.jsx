import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Pencil } from "lucide-react";
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

const IntentItem = ({ intent, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="mb-3 border-none shadow-none bg-gray-50">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{intent.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {intent.required_entities.length} required
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-transparent hover:bg-transparent p-0"
              onClick={() => onEdit(intent)}
            >
              <Pencil size={12} className="text-gray-500 hover:text-gray-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-transparent hover:bg-transparent p-0"
              onClick={() => onDelete(intent)}
            >
              <X size={12} className="text-gray-500 hover:text-gray-700" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs mt-1">
          {intent.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronRight
              size={14}
              className={`text-muted-foreground transform transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            />
            View details
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1">Required Entities:</p>
                <div className="flex flex-wrap gap-1">
                  {intent.required_entities.map((entity) => (
                    <Badge key={entity} variant="secondary" className="text-xs">
                      {entity}
                    </Badge>
                  ))}
                </div>
              </div>
              {intent.optional_entities &&
                intent.optional_entities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">
                      Optional Entities:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {intent.optional_entities.map((entity) => (
                        <Badge
                          key={entity}
                          variant="outline"
                          className="text-xs bg-white"
                        >
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              <div>
                <p className="text-xs font-medium mb-1">Response Policy:</p>
                <p className="text-xs text-muted-foreground">
                  {intent.response_policy}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default IntentItem;
