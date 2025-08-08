import React from "react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlayground } from "@/context/AgentContext";

const AgentsTab = ({ onSelect }) => (
  <CommandGroup>
    <CommandItem
      className="py-2 px-2 rounded-sm text-base"
      onSelect={() => onSelect("Greetings Agent")}
    >
      Greetings Agent
    </CommandItem>
    <CommandItem
      className="py-2 px-2 rounded-sm text-base"
      onSelect={() => onSelect("Structured Agent")}
    >
      Structured Agent
    </CommandItem>
    <CommandItem className="py-2 px-2 rounded-sm text-base">
      Customer Support Agent
    </CommandItem>
    <CommandItem className="py-2 px-2 rounded-sm text-base">
      Generic Agent
    </CommandItem>
  </CommandGroup>
);

const ToolsTab = ({ onSelect }) => {
  const { tools } = usePlayground();
  return (
    <CommandGroup>
      {tools.map((tool, index) => (
        <CommandItem
          key={index}
          className="py-2 px-2 rounded-sm text-base"
          onSelect={() => onSelect(tool.name)}
        >
          {tool.name}
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

const ContextMenu = ({ onSelect }) => {
  return (
    <div className="w-64 bg-white shadow-lg rounded-lg max-h-[85vh] overflow-hidden">
      <Command className="border-none">
        <div className="border-b">
          <CommandInput
            placeholder="Search blocks..."
            className="h-12 border-0 focus:ring-0 rounded-none bg-transparent"
          />
        </div>

        <CommandList className="p-4 max-h-[calc(85vh-4rem)] overflow-y-auto">
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>
            <TabsContent value="agents">
              <AgentsTab onSelect={onSelect} />
            </TabsContent>
            <TabsContent value="tools">
              <ToolsTab onSelect={onSelect} />
            </TabsContent>
          </Tabs>
        </CommandList>
      </Command>
    </div>
  );
};

export default ContextMenu;
