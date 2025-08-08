import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { LoadingButton } from "../ui/loadingButton";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSource } from "@/context/SourceContext";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { useWorkspace } from "@/context/WorkspaceContext";

const CreateSourceModal = () => {
  const router = useRouter();
  const { createSource } = useSource();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState({});

  const handleFormSubmit = async () => {
    // Validate fields
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // If there are errors, display them and don't proceed
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    const res = await createSource(formData);
    if (res.error) toast({ title: res.error, variant: "destructive" });
    else {
      setIsLoading(false);
      router.push(`/${workspaceId}/source/${res._id}`);
    }
    setIsLoading(false);
  };

  return (
    <DialogContent className="sm:w-[512px] max-sm:w-[300px]">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          Create a Knowledge Base
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            placeholder="Knowledge base name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              // Clear error when user types
              if (errors?.name) {
                setErrors({ ...errors, name: null });
              }
            }}
            className={`${
              errors?.name ? "border-red-500 focus-visible:ring-red-500" : ""
            }`}
          />
          {errors?.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Add a description for the knowledge base"
            value={formData.description}
            className="min-h-20"
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
        <DialogFooter className="justify-end max-sm:gap-2">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-background text-primary border border-border"
            >
              Close
            </Button>
          </DialogClose>

          <LoadingButton
            className="px-4 py-2 h-9 bg-primary rounded-md text-sm leading-6 font-medium font-sans"
            onClick={handleFormSubmit}
            loading={isLoading}
          >
            Create Now
          </LoadingButton>
        </DialogFooter>
      </div>
    </DialogContent>
  );
};

export default CreateSourceModal;
