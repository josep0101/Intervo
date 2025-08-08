import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from "react";
import BoardCard from "@/components/activities/BoardCard";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useActivities } from "@/context/ActivitiesContext";
import { Skeleton } from "@/components/ui/skeleton";

const Boards = () => {
  const {
    ticketActivities,
    fetchActivitiesByStatus,
    updateActivityTicketStatus,
    isFetchingData,
    ACTIVITY_COLUMNS,
    loadMoreByStatus,
    isLoadingMore,
  } = useActivities();

  const [columns, setColumns] = useState(ACTIVITY_COLUMNS);

  useEffect(() => {
    console.log("Fetch activities by status");
    fetchActivitiesByStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setColumns((prev) => ({
      ...prev,
      open: { ...prev.open, items: ticketActivities.open?.activities || [] },
      "in-progress": {
        ...prev["in-progress"],
        items: ticketActivities["in-progress"]?.activities || [],
      },
      closed: {
        ...prev.closed,
        items: ticketActivities.closed?.activities || [],
      },
      archived: {
        ...prev.archived,
        items: ticketActivities.archived?.activities || [],
      },
    }));
  }, [ticketActivities]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];
      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);

      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          items: sourceItems,
        },
        [destination.droppableId]: {
          ...destColumn,
          items: destItems,
        },
      };

      // Update the UI immediately for better UX
      setColumns(newColumns);

      // Make API call to update the ticket status
      const success = await updateActivityTicketStatus(
        removed._id,
        destination.droppableId // This will be "open", "in-progress", "closed", or "archived"
      );

      // If the API call fails, revert the changes
      if (!success) {
        setColumns(columns); // Revert to previous state
        // Optionally show an error message to the user
        console.error("Failed to update ticket status");
      }
    } else {
      const column = columns[source.droppableId];
      const copiedItems = [...column.items];
      const [removed] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removed);

      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...column,
          items: copiedItems,
        },
      };

      setColumns(newColumns);
      console.log("Columns after same-column drag:", newColumns);
    }
  };

  // Add scroll handler for each column
  const handleScroll = async (e, columnId) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // If we're near the bottom (within 100px), load more
    if (scrollHeight - scrollTop - clientHeight < 100) {
      await loadMoreByStatus(columnId);
    }
  };

  const SkeletonLoader = () => (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-4 h-[calc(100vh-9em)] min-w-[800px]">
        {/* Open Column - 3 cards */}
        <div className="flex flex-col gap-3 p-3 min-w-[250px]">
          <Badge className="mr-auto bg-zinc-200 px-2.5 py-0.5 text-zinc-800 rounded-full">
            Open
          </Badge>
          <div className="flex flex-col  sm:gap-3 overflow-y-auto overflow-x-hidden mr-8 sm:mr-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg shadow border border-[#DDD] mb-4 sm:mb-0"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-16 rounded-md bg-emerald-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress Column - 1 card */}
        <div className="flex flex-col gap-3 p-3 min-w-[250px]">
          <Badge className="mr-auto bg-purple-200 px-2.5 py-0.5 text-zinc-800 rounded-full">
            In Progress
          </Badge>
          <div className="flex flex-col gap-3 sm:gap-3 mr-8 overflow-y-auto overflow-x-hidden mr-8 sm:mr-0">
            <div className="bg-white p-4 rounded-lg shadow border border-[#DDD] mb-4 sm:mb-0">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-16 rounded-md bg-emerald-100" />
              </div>
            </div>
          </div>
        </div>

        {/* Closed Column - 2 cards */}
        <div className="flex flex-col gap-3 p-3 min-w-[250px]">
          <Badge className="mr-auto bg-rose-200 px-2.5 py-0.5 text-zinc-800 rounded-full">
            Closed
          </Badge>
          <div className="flex flex-col gap-3 sm:gap-3 overflow-y-auto overflow-x-hidden mr-8 sm:mr-0">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg shadow border border-[#DDD] mb-4 sm:mb-0"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-16 rounded-md bg-emerald-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Archived Column - 2 cards */}
        <div className="flex flex-col gap-3 p-3 min-w-[250px]">
          <Badge className="mr-auto bg-zinc-400 px-2.5 py-0.5 text-zinc-800 rounded-full">
            Archived
          </Badge>
          <div className="flex flex-col gap-3 sm:gap-3 overflow-y-auto overflow-x-hidden mr-8 sm:mr-0">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg shadow border border-[#DDD] mb-4 sm:mb-0"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-16 rounded-md bg-emerald-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isFetchingData) {
    return <SkeletonLoader />;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-4 h-[calc(100vh-9em)] min-w-[800px]">
          {isFetchingData ? (
            // Keep the existing initial loading skeleton
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 p-3 min-w-[250px]"
                >
                  <Skeleton className="h-6 w-24" />
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, cardIndex) => (
                      <div
                        key={cardIndex}
                        className="bg-white rounded-lg p-4 shadow-sm mb-4 sm:mb-0"
                      >
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            // Regular columns with loadMore skeletons
            Object.entries(columns).map(([columnId, column]) => (
              <div
                key={columnId}
                className="flex flex-col gap-3 p-3 min-w-[250px]"
              >
                <Badge
                  className={`mr-auto ${column.bgColor} px-2.5 py-0.5 text-zinc-800 rounded-full hover:${column.bgColor}`}
                >
                  {column.title}
                </Badge>
                <Droppable droppableId={columnId}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex flex-col gap-3 sm:gap-3 overflow-y-auto overflow-x-hidden mr-8 sm:mr-0"
                      style={{ height: "calc(100vh - 12em)" }}
                      onScroll={(e) => handleScroll(e, columnId)}
                    >
                      {column.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-500">
                            No activities in {column.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            Drag and drop activities here
                          </p>
                        </div>
                      ) : (
                        column.items
                          .filter((item) => typeof item != "undefined")
                          .map((item, index) => (
                            <Draggable
                              key={item._id}
                              draggableId={item._id}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="mb-4 sm:mb-0"
                                >
                                  <BoardCard selectedActivity={item} />
                                </div>
                              )}
                            </Draggable>
                          ))
                      )}
                      {provided.placeholder}
                      {isLoadingMore[columnId] && (
                        <div className="space-y-3">
                          <div className="bg-white rounded-lg p-4 shadow-sm mb-4 sm:mb-0">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2 mb-2" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-sm mb-4 sm:mb-0">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2 mb-2" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))
          )}
        </div>
      </div>
    </DragDropContext>
  );
};

export default Boards;
