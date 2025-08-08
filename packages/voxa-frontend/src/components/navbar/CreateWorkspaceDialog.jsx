import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { LoadingButton } from "../ui/loadingButton";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useRouter } from "next/navigation";
import TimezoneSelect from "@/components/shared/TimezoneSelect";

const CreateWorkspaceDialog = () => {
  const router = useRouter();
  const { createWorkspace } = useWorkspace();

  const [formData, setFormData] = useState({
    workspaceName: "",
    timezone: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateWorkspace = async () => {
    setError(null);

    if (!formData.workspaceName || formData.workspaceName.trim() === "") {
      setError("Workspace name cannot be empty.");
      return;
    }
    if (!formData.timezone || formData.timezone.trim() === "") {
      setError("Timezone must be selected.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await createWorkspace({
        workspaceName: formData.workspaceName,
        timezone: formData.timezone,
      });
      if (response.success && response.workspace && response.workspace._id) {
        setIsLoading(false);
        router.push(`/${response.workspace._id}/studio`);
      } else {
        console.error(
          "Failed to create workspace:",
          response.error || "Operation not successful or workspace ID missing"
        );
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error creating workspace:", error);
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:w-[400px] max-sm:w-[300px] border border-gray-200 p-0">
      <DialogHeader className="text-center py-5 px-6">
        <DialogTitle className="text-2xl font-semibold text-card-foreground font-sans leading-6 tracking-[-0.36px] text-center">
          Create a New Workspace
        </DialogTitle>
        <p className="text-muted-foreground font-sans text-sm font-normal leading-5 text-center mt-1">
          Add a new workspace into your business
        </p>
      </DialogHeader>
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Workspace name</label>
          <Input
            placeholder="Workspace name"
            className="h-10"
            value={formData.workspaceName}
            onChange={(e) => {
              console.log(
                "Raw input value from e.target.value:",
                `'${e.target.value}'`
              );
              setFormData({ ...formData, workspaceName: e.target.value });
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Timezone</label>
          <TimezoneSelect
            value={formData.timezone}
            onValueChange={(newTimezone) =>
              setFormData({ ...formData, timezone: newTimezone })
            }
            triggerClassName="w-full max-w-[350px] h-10 overflow-hidden whitespace-nowrap text-ellipsis"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 text-center px-1 py-2">{error}</p>
        )}
        <LoadingButton
          loading={isLoading}
          onClick={handleCreateWorkspace}
          className="h-10"
        >
          Create a New Workspace Now
        </LoadingButton>
      </div>
    </DialogContent>
  );
};

export default CreateWorkspaceDialog;
