"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import ContextMenu from "../components/ContextMenu";
import { useReactFlow, useViewport } from "@xyflow/react";
import { Position } from "@xyflow/react";

export const withAddButton = (WrappedNode) => {
  const WithAddButtonComponent = ({ data, id, ...props }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeHandleId, setActiveHandleId] = useState(null);
    const [parentNodeId, setParentNodeId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const buttonRef = useRef(null);
    const modalRef = useRef(null);
    const { getNodes, addNodes, addEdges } = useReactFlow();
    const { zoom } = useViewport();

    const getActiveHandle = useCallback(() => {
      const currentNode = getNodes().find((node) => node.id === id);
      if (!currentNode) return null;

      // Get all handles from the node's DOM element
      const nodeElement = document.querySelector(`[data-id="${id}"]`);
      if (!nodeElement) return null;

      const handles = nodeElement.querySelectorAll("[data-class-handle]");
      if (!handles.length) return null;

      // Get the first handle
      const firstHandle = handles[0];
      return {
        handleId: firstHandle.dataset.classHandle,
        parentNodeId: firstHandle.dataset.nodeId,
      };
    }, [getNodes, id]);

    const handleAddNode = useCallback(
      (nodeType) => {
        console.log("handleAddNode", nodeType);
        const activeHandle = getActiveHandle();
        if (!activeHandle) return;

        const { handleId: activeHandleId, parentNodeId } = activeHandle;
        const parentNode = getNodes().find((node) => node.id === parentNodeId);
        console.log("parentNode", parentNode, activeHandleId);
        if (!parentNode || !activeHandleId) return;

        // Safely handle the className extraction
        const className = activeHandleId?.split("-")[0] || "";
        const classes = parentNode.data?.settings?.classes || [
          "Class 1",
          "Class 2",
        ];
        const classIndex = classes.indexOf(className);
        const yOffset = classIndex * 100; // Adjust this value as needed

        // Create new node
        const newNode = {
          id: `${nodeType.replace(/\s+/g, "-")}-${Date.now()}`,
          type: "agentNode",
          position: {
            x: parentNode.position.x + 200,
            y: parentNode.position.y + yOffset,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            label: nodeType,
            settings: {
              name: nodeType,
            },
          },
        };

        // Add node first
        addNodes(newNode);

        // Wait for next tick and verify nodes exist before adding edge
        setTimeout(() => {
          const nodes = getNodes();
          const targetExists = nodes.some((node) => node.id === newNode.id);

          if (!targetExists) {
            console.log("Target node not ready, retrying...");
            setTimeout(() => {
              const newEdge = {
                id: `${parentNodeId}-${newNode.id}`,
                source: parentNodeId,
                target: newNode.id,
                sourceHandle: activeHandleId,
                type: "default",
                animated: true,
              };
              addEdges(newEdge);
            }, 1000);
            return;
          }

          const newEdge = {
            id: `${parentNodeId}-${newNode.id}`,
            source: parentNodeId,
            target: newNode.id,
            sourceHandle: activeHandleId,
            type: "default",
            animated: true,
          };

          console.log("newEdge", newEdge, nodes);
          addEdges([newEdge]);
        }, 100);

        setIsModalOpen(false);
      },
      [getNodes, addNodes, addEdges, getActiveHandle]
    );

    const handleMouseEnter = (event) => {
      const classDiv = event.target.closest("[data-class-handle]");
      console.log(classDiv, "classDiv");
      if (classDiv) {
        setActiveHandleId(classDiv.dataset.classHandle);
        const parentNodeId = classDiv.dataset.nodeId;
        if (parentNodeId) {
          const parentNode = getNodes().find(
            (node) => node.id === parentNodeId
          );
          if (parentNode) {
            setParentNodeId(parentNodeId);
          }
        }
      }
    };

    const handleMouseLeave = () => {
      setActiveHandleId(null);
    };

    const handleOpenMenu = (e) => {
      e.stopPropagation();
      const buttonRect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        x: buttonRect.right + 10,
        y: buttonRect.top,
      });
      setIsModalOpen(true);
    };

    useEffect(() => {
      if (!isModalOpen) return;

      const handleClickOutside = (event) => {
        // Check if click is outside the modal
        if (modalRef.current && !modalRef.current.contains(event.target)) {
          // Check if click is not on the button that opened the menu
          if (buttonRef.current && !buttonRef.current.contains(event.target)) {
            setIsModalOpen(false);
          }
        }
      };

      // Add listener to document to catch all clicks
      document.addEventListener("mousedown", handleClickOutside, true);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside, true);
      };
    }, [isModalOpen]);

    return (
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div className="relative group/node">
          <WrappedNode data={data} id={id} {...props} />
          {true && (
            <div className="absolute top-0 -right-10 h-full w-10 cursor-pointer">
              <Button
                ref={buttonRef}
                onClick={handleOpenMenu}
                variant="secondary"
                size="sm"
                className="absolute top-1/2 -translate-y-1/2 left-2 h-6 w-6 rounded-full flex items-center justify-center p-0 hover:bg-black hover:text-white opacity-0 group-hover/node:opacity-100 transition-opacity duration-300"
              >
                <PlusIcon className="h-3 w-3" />
              </Button>
            </div>
          )}
          {isModalOpen &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                ref={modalRef}
                className="fixed"
                style={{
                  left: `${menuPosition.x}px`,
                  top: `${menuPosition.y}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  zIndex: 9999,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <ContextMenu onSelect={handleAddNode} />
              </div>,
              document.body
            )}
        </div>
      </div>
    );
  };

  WithAddButtonComponent.displayName = `WithAddButton(${getDisplayName(
    WrappedNode
  )})`;
  return WithAddButtonComponent;
};

// Helper function to get display name
const getDisplayName = (WrappedComponent) => {
  return WrappedComponent.displayName || WrappedComponent.name || "Component";
};

withAddButton.displayName = "withAddButton";
