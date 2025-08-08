"use client";
export const runtime = "edge";

import { useCallback, useState, useEffect, useRef } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from "@xyflow/react";
import { usePlayground } from "@/context/AgentContext";
import { useParams } from "next/navigation";
import { Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { initialNodes, nodeTypes } from "./nodes";
import { initialEdges, edgeTypes } from "./edges";
import AgentModal from "./components/AgentModal";
import IntentClassifierModal from "./components/IntentClassifierModal";

export default function App() {
  const params = useParams();
  const { slug } = params;
  const {
    aiConfig,
    fetchAIConfig,
    updateAIConfig,
    isFetchingAgent,
    fetchTools,
  } = usePlayground();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isIntentModalOpen, setIsIntentModalOpen] = useState(false);
  const toolsFetched = useRef(false);

  // Fetch agent config when component mounts
  useEffect(() => {
    if (slug) {
      fetchAIConfig(slug);
      console.log("fetchtools");
      if (!toolsFetched.current) {
        fetchTools();
        toolsFetched.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load flow data from agent config
  useEffect(() => {
    if (isFetchingAgent) return;

    if (aiConfig?.orchestrationFlow?.nodes?.length > 0) {
      setNodes(aiConfig.orchestrationFlow.nodes);

      // Remove duplicate edges and ensure consistent IDs
      const uniqueEdges = aiConfig.orchestrationFlow.edges?.reduce(
        (acc, edge) => {
          // Create a unique key for each edge based on source and target
          const key = `${edge.source}-${edge.target}`;

          // Only keep one edge between each source-target pair
          if (!acc[key]) {
            acc[key] = {
              ...edge,
              id: edge.id || `edge-${edge.source}-${edge.target}`, // Ensure consistent ID
              sourceHandle: edge.sourceHandle || `${edge.source}-output`,
              animated: true,
            };
          }
          return acc;
        },
        {}
      );

      setEdges(Object.values(uniqueEdges) || []);
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [aiConfig, isFetchingAgent, setNodes, setEdges]);

  // Debounced save function to prevent too many API calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (nodes, edges) => {
      try {
        await updateAIConfig({
          _id: aiConfig._id,
          orchestrationFlow: {
            nodes,
            edges,
          },
        });
      } catch (error) {
        console.error("Failed to save flow:", error);
      }
    }, 1000),
    [aiConfig?._id]
  );

  // Save flow data when nodes or edges change
  useEffect(() => {
    if (aiConfig?._id) {
      // Remove duplicate edges before saving
      const uniqueEdges = edges.reduce((acc, edge) => {
        const key = `${edge.source}-${edge.target}`;
        if (!acc[key]) {
          acc[key] = {
            ...edge,
            id: `edge-${edge.source}-${edge.target}`,
            sourceHandle: edge.sourceHandle,
            animated: true,
          };
        }
        return acc;
      }, {});

      debouncedSave(nodes, Object.values(uniqueEdges));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, aiConfig?._id]);

  const onConnect = useCallback(
    (connection) =>
      setEdges((edges) => addEdge({ ...connection, animated: true }, edges)),
    [setEdges]
  );

  const handleAddNode = useCallback(
    (parentId, sourceHandleId = null, nodeType = null) => {
      const parentNode = nodes.find((node) => node.id === parentId);
      console.log("nodeType", nodeType);
      const newNode = {
        id: `${nodeType || "node"}-${Date.now()}`,
        type: "agentNode",
        position: {
          x: parentNode.position.x + 200,
          y: parentNode.position.y,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: nodeType || `Node ${nodes.length + 1}`,
          onAddNode: handleAddNode,
        },
      };

      const newEdge = {
        id: `edge-${Date.now()}`,
        source: parentId,
        sourceHandle: sourceHandleId,
        target: newNode.id,
        animated: true,
      };

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, setNodes, setEdges]
  );

  // Update all nodes to include the onAddNode handler
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, onAddNode: handleAddNode },
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNodeChange = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: newData,
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Update the initial node data to include the onChange handler
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onChange: handleNodeChange,
        },
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addNewNode = () => {
    const newNode = {
      id: `node-${nodes.length + 1}`,
      type: "default",
      position: { x: 100, y: 100 },
      data: { label: `Node ${nodes.length + 1}` },
    };

    // If connecting to another node, create an animated edge
    if (selectedNode) {
      const newEdge = {
        id: `edge-${edges.length + 1}`,
        source: selectedNode.id,
        target: newNode.id,
        animated: true,
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    setNodes((nds) => [...nds, newNode]);
    setIsModalOpen(false);
  };

  const onNodeClick = useCallback(
    (event, node) => {
      setSelectedNode(node);
      console.log(node, "node");

      // Don't open modal for trigger nodes
      if (node.id === "trigger" || node.type === "customInput") {
        return;
      }

      // Check node type and open appropriate modal
      if (node.id === "intent-classifier") {
        setIsIntentModalOpen(true);
      } else if (node.id === "placeholder") {
        setIsModalOpen(false);
      } else {
        console.log(node.id, "node.id");
        setIsModalOpen(true);
      }
    },
    [setSelectedNode]
  );

  const handleSaveAgent = useCallback(
    (updatedSettings) => {
      console.log(updatedSettings, "updatedSettings");
      if (!selectedNode) return;

      // Update the node data with the new settings
      setNodes((nodes) => {
        const newNodes = nodes.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  settings: updatedSettings,
                },
              }
            : node
        );

        // Find and update the selected node
        const updatedNode = newNodes.find(
          (node) => node.id === selectedNode.id
        );
        setSelectedNode(updatedNode);

        return newNodes;
      });
    },
    [selectedNode, setNodes, setSelectedNode]
  );

  const handleSaveIntentClassifier = useCallback(
    (updatedSettings) => {
      if (!selectedNode) return;

      setNodes((nodes) => {
        const newNodes = nodes.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  settings: updatedSettings,
                },
              }
            : node
        );

        const updatedNode = newNodes.find(
          (node) => node.id === selectedNode.id
        );
        setSelectedNode(updatedNode);

        return newNodes;
      });
    },
    [selectedNode, setNodes, setSelectedNode]
  );

  const handleDeleteNode = useCallback(
    (nodeId) => {
      // Remove the node
      setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));

      // Remove all edges connected to this node
      setEdges((edges) =>
        edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );

      // Close the modal
      setIsModalOpen(false);
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  console.log(edges, onEdgesChange, "edges");

  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
      {isFetchingAgent ? (
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          edges={edges}
          edgeTypes={edgeTypes}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <MiniMap />
          <Controls />
          <Panel
            position={
              selectedNode?.type === "classItem" ? "center-right" : "top-right"
            }
          >
            <AgentModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              agentData={
                selectedNode?.data?.settings || {
                  id: selectedNode?.id,
                  type: selectedNode?.type,
                  ...selectedNode?.data,
                  name: selectedNode?.data?.label || "",
                  description: "",
                  intents: [],
                  responses: { default: "", variations: [] },
                  knowledge_base: "",
                  functions: [],
                  policies: { tone: "friendly", language: "en-US" },
                  llm: {
                    provider: "openai",
                    model: "",
                    parameters: {},
                  },
                  active: true,
                }
              }
              onSave={handleSaveAgent}
              onDelete={handleDeleteNode}
              selectedNode={selectedNode}
            />
            <IntentClassifierModal
              isOpen={isIntentModalOpen}
              onClose={() => setIsIntentModalOpen(false)}
              classifierData={
                selectedNode?.data?.settings || {
                  name: selectedNode?.data?.label || "",
                  description: "",
                  intents: [],
                  threshold: 0.7,
                  model: {
                    provider: "openai",
                    name: "",
                    parameters: {},
                  },
                  active: true,
                }
              }
              onSave={handleSaveIntentClassifier}
            />
          </Panel>
        </ReactFlow>
      )}
    </div>
  );
}

// Debounce utility function
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
