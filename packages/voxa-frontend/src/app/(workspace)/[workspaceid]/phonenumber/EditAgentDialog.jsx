import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loadingButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EditAgentDialog = ({ agents, isChangingAgent, setModifyEntryData, handleModifyAgent }) => {
  return (
    <DialogContent className="w-full max-sm:w-[300px] max-w-[512px]">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          Change Agent
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-5 text-foreground font-sans">
          Select Agent
        </label>
        <Select
          onValueChange={(value) =>
            setModifyEntryData((prev) => ({ ...prev, agentId: value }))
          }
          disabled={agents.length <= 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((item, index) => (
              <SelectItem value={item._id} key={index}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter className="justify-end max-sm:flex-col gap-2">
        <DialogClose asChild>
          <Button
            type="button"
            className="bg-background text-primary border border-border"
          >
            Close
          </Button>
        </DialogClose>

        <LoadingButton
          className="px-3 py-2 bg-primary rounded-md text-sm leading-6 font-medium font-sans"
          onClick={handleModifyAgent}
          loading={isChangingAgent}
          type="submit"
        >
          Update Agent
        </LoadingButton>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditAgentDialog;
