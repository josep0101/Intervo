import { useSource } from "@/context/SourceContext";
import React, { useEffect, useState } from "react";
import StudioCard from "@/components/studio/StudioCard";
import { useRouter } from "next/navigation";
import { UserRoundPlus, BookPlus } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreateSourceModal from "@/components/studio/CreateSourceModal";
import CreateAgentModal from "@/components/studio/CreateAgentModal";
import StudioSkeleton from "@/components/studio/StudioSkeleton";
import { useWorkspace } from "@/context/WorkspaceContext";

const Agents = ({ setItems, filtered, setIsSearching }) => {
  const { deleteSource, getAllSources } = useSource();
  const router = useRouter();
  const [sources, setSources] = useState([]);
  const { workspaceId } = useWorkspace();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      setIsLoading(true);
      const sources = await getAllSources();
      setSources(sources);
      setItems(sources);
      setIsLoading(false);
    };

    setIsSearching(false);
    fetchSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditInfo = (_id) => {
    router.push(`/${workspaceId}/source/${_id}/`);
  };

  const handleDelete = (index, _id) => {
    const updatedArray = filtered.filter((_, i) => i !== index);
    setItems(updatedArray);
    deleteSource(_id);
  };

  return (
    <div className="max-md:mt-4 grid grid-cols-4 gap-4 max-md:gap-2 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
      <div className="md:max-w-[305px] w-full h-[156px] p-4 border border-zinc-200 shadow-sm rounded-md bg-sidebar-accent flex flex-col justify-between">
        <h4 className="pb-4 font-sans text-sm font-medium text-secondaryText">
          Create Agents for your Bussiness
        </h4>
        <div className="flex flex-col font-medium text-sm font-sans leading-6">
          <Dialog>
            <DialogTrigger className="py-1.5 px-2 flex items-center gap-1">
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
        filtered?.map((item, index) => (
          <StudioCard
            key={index}
            type="source"
            title={item.name}
            subtitle={item.metadata?.characters}
            description={item.description}
            status={item.updatedAt}
            handleDelete={() => handleDelete(index, item._id)}
            editInfo={() => handleEditInfo(item._id)}
          />
        ))
      )}
    </div>
  );
};

export default Agents;
