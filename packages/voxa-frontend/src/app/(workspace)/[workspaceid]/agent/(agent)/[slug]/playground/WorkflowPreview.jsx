import React, { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";

import { useRouter } from "next/navigation";
import { usePlayground } from "@/context/AgentContext";
import { nodeTypes } from "./canvas/nodes";
import { edgeTypes } from "./canvas/edges";
import "@xyflow/react/dist/style.css";

export default function WorkflowPreview({ params }) {
  const router = useRouter();
  const { aiConfig } = usePlayground();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  useEffect(() => {
    if (aiConfig?.orchestrationFlow?.nodes?.length > 0) {
      // Use the actual workflow data with more spacing between nodes
      const scaledNodes = aiConfig.orchestrationFlow.nodes.map((node) => ({
        ...node,
        position: {
          x: node.position.x * 0.8, // Much more horizontal spacing between nodes
          y: node.position.y * 0.8, // Much more vertical spacing between nodes
        },
        // Keep all original data including settings, but add preview flag
        data: {
          ...node.data,
          preview: true,
          // Disable add button functionality in preview
          onAddNode: undefined,
        },
      }));

      setNodes(scaledNodes);

      // Remove duplicate edges and ensure consistent format
      const uniqueEdges = aiConfig.orchestrationFlow.edges?.reduce(
        (acc, edge) => {
          const key = `${edge.source}-${edge.target}`;
          if (!acc[key]) {
            acc[key] = {
              ...edge,
              id: edge.id || `edge-${edge.source}-${edge.target}`,
              animated: true,
            };
          }
          return acc;
        },
        {}
      );

      setEdges(Object.values(uniqueEdges) || []);
    } else {
      // No workflow data available
      setNodes([]);
      setEdges([]);
    }
  }, [aiConfig?.orchestrationFlow, setNodes, setEdges]);

  const handleViewFullWorkflow = () => {
    router.push(`${window.location.pathname}/canvas`);
  };

  return (
    <div className="h-full w-full bg-gray-50 rounded-lg border border-gray-200 relative overflow-hidden">
      {/* Edit Workflow Button at Bottom */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4">
        <button
          onClick={handleViewFullWorkflow}
          className="w-full rounded-md bg-primary hover:bg-primary/90 flex px-3 py-2 justify-center items-center gap-1 text-primary-foreground text-sm font-medium font-sans leading-6 transition-colors"
          style={{
            fontFamily: "var(--font-family-font-sans, Geist)",
            fontWeight: "var(--font-weight-font-medium, 500)",
          }}
        >
          Edit Workflow
        </button>
      </div>

      {/* React Flow Preview */}
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            maxZoom: 0.8,
            minZoom: 0.3,
          }}
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnDrag={false}
          panOnScroll={false}
          panOnDragStart={false}
          className="bg-gray-50"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" gap={16} size={1} />
        </ReactFlow>
      </div>

      {/* Overlay to prevent interaction (excluding the button area) */}
      <div className="absolute inset-0 pointer-events-none bg-transparent" />
    </div>
  );
}
