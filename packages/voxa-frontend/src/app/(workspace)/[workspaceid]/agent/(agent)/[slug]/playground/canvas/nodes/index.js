import { Plus, PlusCircle } from "lucide-react";
import { PositionLoggerNode } from "./PositionLoggerNode";
import { withAddButton } from "./withAddButton";
import { Handle, Position, useEdges, useReactFlow } from "@xyflow/react";
import { IoPerson } from "react-icons/io5";

const nodeTexts = {
  Trigger: "When user starts the call or chat",
  "Start with": "a greeting and making the user feel welcome. ",
  "When user asks": "About appointment or booking",
  "End with": "a goodbye and thanking the user.",
};

// Basic node components
const InputNode = ({ data }) => (
  <div className="p-4 w-[200px] h-[120px] shadow-sm rounded-2xl bg-white text-xs">
    <Handle
      type="source"
      position={Position.Right}
      id="trigger-output"
      className="!absolute !right-[-4px]"
      style={{
        width: "4px",
        height: "4px",
      }}
    />
    <div className="inline-block px-1 font-sans font-medium text-sm leading-6 bg-amber-400 rounded-sm max-w-full">
      <span className="truncate block"># {data.label}</span>
    </div>
    <p className="mt-1 text-gray-700 text-sm leading-5 line-clamp-3 overflow-hidden">
      {data.settings?.description || nodeTexts[data.label]}
    </p>
  </div>
);

// Create a separate component for the class item
const ClassItem = ({ data, id }) => {
  const edges = useEdges();
  const hasConnectedEdge = edges.some((edge) => edge.source === id);

  // Check if this is a when-user-asks node
  const isWhenUserAsksNode =
    id?.includes("when-user-ask") || data.label === "When user asks";

  // Determine what text to display
  const getDisplayText = () => {
    if (isWhenUserAsksNode && data.settings?.selectedTopics?.length > 0) {
      return data.settings.selectedTopics.join(", ");
    }
    return data.settings?.description || nodeTexts[data.label];
  };

  return (
    <div
      className="p-4 w-[200px] h-[120px] shadow-sm rounded-2xl bg-white text-xs"
      data-class-handle={`${data.label}-output`}
      data-node-id={id}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!absolute !left-[-4px]"
        style={{
          width: "4px",
          height: "4px",
        }}
      />
      <div className="inline-block px-1 font-sans font-medium text-sm leading-6 bg-amber-400 rounded-sm max-w-full">
        <span className="truncate block"># {data.label}</span>
      </div>
      <p className="mt-1 text-gray-700 text-sm leading-5 line-clamp-3 overflow-hidden">
        {getDisplayText()}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        id={`${data.label}-output`}
        className="!absolute !right-[-4px]"
        style={{
          width: "8px",
          height: "8px",
          background: "#b1b1b7",
          border: "1px solid #fff",
        }}
      />
    </div>
  );
};

// Enhance only the ClassItem with add button
const EnhancedClassItem = withAddButton(ClassItem);

// Keep ProcessNode clean without the withAddButton enhancement
const ProcessNode = ({ data, id }) => (
  <div className="px-4 py-2 shadow-sm rounded-md bg-white text-xs">
    <Handle type="target" position={Position.Left} />
    <div className="font-medium mb-2">{data.label}</div>

    <div className="space-y-2">
      {(
        data.settings?.classes || [
          { topic: "Default Topic" },
          { topic: "Default Topic" },
        ]
      ).map((classObj, index) => (
        <EnhancedClassItem
          key={index}
          class={classObj}
          index={index}
          nodeId={id}
        />
      ))}
    </div>
  </div>
);

// Enhance nodes with add button functionality
const EnhancedInputNode = withAddButton(InputNode);

// Add new AgentNode component
const AgentNode = ({ data, id }) => {
  const edges = useEdges();
  const hasConnectedEdge = edges.some((edge) => edge.source === id);

  console.log(hasConnectedEdge, "testing000");
  return (
    <div className="w-[200px] h-[120px] shadow-sm rounded-2xl bg-white border border-border text-xs p-4">
      <Handle
        type="target"
        position={Position.Left}
        className="!absolute !left-[-4px]"
        style={{
          width: "4px",
          height: "4px",
        }}
      />
      <div className="flex flex-col h-full gap-1">
        <div className="gap-1 flex items-center px-1 bg-primary rounded mr-auto max-w-full">
          <IoPerson className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <p className="text-white leading-6 text-sm font-sans font-medium truncate">
            {data.settings?.name || "Greeting Agent"}
          </p>
        </div>
        <p className="text-gray-500 font-sans text-sm leading-5 line-clamp-3 overflow-hidden">
          {data.settings?.description || "Click to add description"}
        </p>
      </div>

      {hasConnectedEdge && (
        <Handle
          type="source"
          position={Position.Right}
          id={`${data.label}-output`}
          className="!absolute !right-[-4px]"
          style={{
            width: "8px",
            height: "8px",
            background: "#b1b1b7",
            border: "1px solid #fff",
          }}
        />
      )}
    </div>
  );
};

// Enhance AgentNode with add button
const EnhancedAgentNode = withAddButton(AgentNode);

// Add new PlaceholderNode component
const PlaceholderNode = ({ data, id }) => {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();

  const handleClick = () => {
    const currentNode = getNode(id);
    if (!currentNode) return;

    const newNodeId = `when-user-asked-${Date.now()}`;

    // Find the incoming edge to the current placeholder
    const incomingEdge = getEdges().find((edge) => edge.target === id);
    const sourceNodeId = incomingEdge?.source || "trigger";

    // Create new nodes
    setNodes((nodes) => [
      ...nodes.filter((node) => node.id !== id),
      {
        id: newNodeId,
        type: "classItem",
        position: currentNode.position,
        data: {
          label: "When user asks",
        },
      },
      {
        id: "placeholder",
        type: "placeholder",
        position: {
          x: currentNode.position.x,
          y: currentNode.position.y + 150,
        },
        data: {},
      },
    ]);

    // Create new edges
    setEdges((edges) => [
      ...edges.filter((edge) => edge.target !== id),
      {
        id: `edge-${newNodeId}`,
        source: sourceNodeId,
        target: newNodeId,
        type: "default",
      },
      {
        id: `edge-placeholder`,
        source: sourceNodeId,
        target: "placeholder",
        type: "default",
      },
    ]);
    return;
  };

  return (
    <div
      onClick={handleClick}
      className="group w-[200px] h-[120px] shadow-sm rounded-2xl bg-slate-200 hover:bg-slate-300 border border-slate-300 hover:border-slate-400 text-xs p-4 flex items-center justify-center cursor-pointer transition-colors"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!absolute !left-[-4px]"
        style={{
          width: "4px",
          height: "4px",
        }}
      />
      <div className="flex justify-center items-center h-6 w-6 bg-slate-400 group-hover:bg-slate-600 rounded-full">
        <Plus className="h-4 w-4 text-white" />
      </div>
    </div>
  );
};

// Update nodeTypes
export const nodeTypes = {
  customInput: EnhancedInputNode,
  classItem: EnhancedClassItem,
  agentNode: AgentNode,
  process: ProcessNode,
  placeholder: PlaceholderNode,
};

export const initialNodes = [
  {
    id: "trigger",
    type: "customInput",
    position: {
      x: 100,
      y: 100,
    },
    data: {
      label: "Trigger",
    },
    _id: "678f714ab9f771803ef067db",
  },
  {
    id: "placeholder",
    type: "placeholder",
    position: {
      x: 374.4268777160796,
      y: 587.8861070872895,
    },
    _id: "678f714ab9f771803ef067dc",
  },
  {
    id: "start-with",
    type: "classItem",
    position: {
      x: 400,
      y: 100,
    },
    data: {
      label: "Start with",
      settings: {
        id: "start-with",
        type: "classItem",
        label: "Start with",
        name: "Start with",
        description: "greeting the user and welcoming them to the project",
        intents: [],
        responses: {
          default: "",
          variations: [],
        },
        knowledge_base: "",
        functions: [],
        policies: {
          tone: "friendly",
          language: "en-US",
        },
        llm: {
          provider: "openai",
          model: "",
        },
        active: true,
      },
    },
    _id: "678f714ab9f771803ef067dd",
  },
  {
    id: "when-user-asked-1",
    type: "classItem",
    position: {
      x: 400,
      y: 250,
    },
    data: {
      label: "When user asks",
      settings: {
        id: "when-user-asked-1",
        type: "classItem",
        label: "When user asks",
        name: "When user asks",
        description: "about appointment booking",
        intents: [],
        responses: {
          default: "",
          variations: [],
        },
        knowledge_base: "",
        functions: [],
        policies: {
          tone: "friendly",
          language: "en-US",
        },
        llm: {
          provider: "openai",
          model: "",
        },
        active: true,
      },
    },
    _id: "678f714ab9f771803ef067de",
  },
  {
    id: "end-with",
    type: "classItem",
    position: {
      x: 400,
      y: 400,
    },
    data: {
      label: "End with",
    },
    _id: "678f714ab9f771803ef067df",
  },
  {
    id: "greeting-agent",
    type: "agentNode",
    position: {
      x: 800,
      y: 100,
    },
    sourcePosition: "right",
    targetPosition: "left",
    data: {
      label: "Greeting Agent",
      settings: {
        id: "greeting-agent",
        type: "agentNode",
        label: "Greeting Agent",
        name: "Greeting Agent",
        description:
          "Greet the user. Your name is Sarah. You're representing Voxa.ai. be friendly. ",
        intents: [],
        responses: {
          default: "",
          variations: [],
        },
        knowledge_base: "",
        functions: [],
        policies: {
          tone: "friendly",
          language: "en-US",
        },
        llm: {
          provider: "openai",
          model: "",
        },
        active: true,
      },
    },
    _id: "678f714ab9f771803ef067e0",
  },
  {
    id: "Structured-Agent-1737454102907",
    type: "agentNode",
    position: {
      x: 808,
      y: 264,
    },
    sourcePosition: "right",
    targetPosition: "left",
    data: {
      label: "Structured Agent",
      settings: {
        name: "Booking Agent",
        description:
          "You will help schedule a call. Available timings are from 9am-5pm IST.",
      },
    },
    _id: "678f7219b9f771803ef06a81",
  },
  {
    id: "Structured-Agent-1737454184725",
    type: "agentNode",
    position: {
      x: 800.2273424803127,
      y: 421.44171074515805,
    },
    sourcePosition: "right",
    targetPosition: "left",
    data: {
      label: "Structured Agent",
      settings: {
        name: "Ending Agent",
        description:
          "End the call on a positive note. Wish them a good day ahead.",
      },
    },
    _id: "678f74f1b9f771803ef072ac",
  },
];
