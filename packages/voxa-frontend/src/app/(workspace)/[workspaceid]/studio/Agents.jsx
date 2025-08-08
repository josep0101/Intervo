import { usePlayground } from "@/context/AgentContext";
import React, { useEffect, useState } from "react";
import StudioCard from "@/components/studio/StudioCard";
import { useRouter } from "next/navigation";
import { UserRoundPlus, BookPlus } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreateSourceModal from "@/components/studio/CreateSourceModal";
import CreateAgentModal from "@/components/studio/CreateAgentModal";
import StudioSkeleton from "@/components/studio/StudioSkeleton";
import { useWorkspace } from "@/context/WorkspaceContext";

const Agents = ({
  setItems,
  filtered,
  setIsSearching,
  shouldOpenCreateModal,
  setShouldOpenCreateModal,
}) => {
  const { getAllAgents, deleteAgent } = usePlayground();
  const {
    workspaceId,
    checkAndShowPricingPopup,
    workspaceLoading,
    subscriptionLoading,
  } = useWorkspace();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      const agents = await getAllAgents();
      setItems(agents);
      setIsLoading(false);
      if (agents.length === 0) {
        setIsCreateAgentModalOpen(true);
      }
    };

    setIsSearching(false);
    fetchAgents();
  }, [getAllAgents, setItems, setIsSearching]);

  // Handle shouldOpenCreateModal prop from parent
  useEffect(() => {
    if (shouldOpenCreateModal) {
      setIsCreateAgentModalOpen(true);
      // Reset the parent state
      if (setShouldOpenCreateModal) {
        setShouldOpenCreateModal(false);
      }
    }
  }, [shouldOpenCreateModal, setShouldOpenCreateModal]);

  const handleEditInfo = (_id) => {
    router.push(`/${workspaceId}/agent/${_id}/playground`);
  };

  const handleDelete = (index, _id) => {
    const updatedArray = filtered.filter((_, i) => i !== index);
    setItems(updatedArray);
    deleteAgent(_id);
  };

  const handleCreateAgentClick = () => {
    // Check if user has access, if not show pricing popup
    const needsPricing = checkAndShowPricingPopup();
    if (!needsPricing) {
      // User has access, proceed to open the modal
      setIsCreateAgentModalOpen(true);
    }
  };

  return (
    <div className="max-md:mt-4 grid grid-cols-4 gap-4 max-md:gap-2 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
      <div className="md:max-w-[305px] w-full h-[156px] p-4 border border-zinc-200 shadow-sm rounded-md bg-sidebar-accent flex flex-col justify-between">
        <h4 className="pb-4 font-sans text-sm font-medium text-secondaryText">
          Create Agents for your Bussiness
        </h4>
        <div className="flex flex-col font-medium text-sm font-sans leading-6">
          <Dialog
            open={isCreateAgentModalOpen}
            onOpenChange={setIsCreateAgentModalOpen}
          >
            <DialogTrigger
              className={`py-1.5 px-2 flex items-center gap-1 ${
                workspaceLoading || subscriptionLoading
                  ? "opacity-50 cursor-not-allowed text-gray-400"
                  : "hover:bg-gray-100"
              }`}
              disabled={workspaceLoading || subscriptionLoading}
              onClick={(e) => {
                e.preventDefault(); // Prevent default dialog opening
                handleCreateAgentClick();
              }}
            >
              {" "}
              <UserRoundPlus className="h-4 w-4" /> Create a New Agent
            </DialogTrigger>
            <CreateAgentModal />
          </Dialog>
          <Dialog>
            <DialogTrigger className="py-1.5 px-2 flex items-center gap-1">
              <BookPlus className="h-4 w-4" />
              Create a Knowledge Base
            </DialogTrigger>
            <CreateSourceModal />
          </Dialog>
        </div>
      </div>
      {isLoading ? (
        <StudioSkeleton />
      ) : (
        filtered.map((item, index) => (
          <StudioCard
            key={index}
            type="agent"
            title={item.name}
            subtitle={item.agentType}
            description={item.prompt}
            status={item.published}
            handleDelete={() => handleDelete(index, item._id)}
            editInfo={() => handleEditInfo(item._id)}
          />
        ))
      )}
    </div>
  );
};

export default Agents;
