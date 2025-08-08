import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loadingButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import { usePhoneNumber } from "@/context/PhoneNumberContext";
import { useToast } from "@/hooks/use-toast";

const NewNumberDialog = ({ setOpen, open, setItems, items, agents }) => {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const { getTemporaryNumbers, getPurchasedTwilioNumbers, assignAgent } =
    usePhoneNumber();

  const [newPhoneData, setNewPhoneData] = useState({
    phoneNumber: null,
    agentId: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAgent = async () => {
    setIsSubmitting(true);
    const res = await assignAgent(newPhoneData);
    if (res.error) {
      toast({ title: res.error, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    setItems([...items, res.phoneNumber]);
    setIsSubmitting(false);
    setOpen(false);
  };

  const fetchNumbers = useCallback(async () => {
    setNumbers([]);
    const temporaryNumbers = await getTemporaryNumbers();
    const purchasedTwilioNumbers = await getPurchasedTwilioNumbers();

    setNumbers((prevState) => [
      ...prevState,
      temporaryNumbers,
      ...(purchasedTwilioNumbers.length > 0 ? purchasedTwilioNumbers : []),
    ]);
    setIsLoading(false);
  }, [getTemporaryNumbers, getPurchasedTwilioNumbers]);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetchNumbers();
  }, [open, fetchNumbers]);

  if (isLoading) {
    return (
      <DialogContent className="w-full max-w-[512px] max-sm:w-[300px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Loading...
          </DialogTitle>
        </DialogHeader>
      </DialogContent>
    );
  } else
    return (
      <DialogContent className="w-full max-sm:w-[300px] max-w-[512px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add New Phone Number
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-5 text-foreground font-sans">
              Phone Number
            </label>
            <Select
              onValueChange={(value) => {
                setNewPhoneData({
                  ...newPhoneData,
                  phoneNumber: numbers[value],
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select phone number" />
              </SelectTrigger>
              <SelectContent>
                {numbers.map(
                  (item, index) =>
                    item && (
                      <SelectItem key={index} value={index}>
                        {item.phoneNumber} {item.isTemporary && "(FREE)"}
                      </SelectItem>
                    )
                )}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground font-sans text-sm leading-5">
              Connect Twilio and Purchase phone number in Twilio
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-5 text-foreground font-sans">
              Select Agent
            </label>
            <Select
              onValueChange={(value) =>
                setNewPhoneData({ ...newPhoneData, agentId: value })
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
              onClick={handleCreateAgent}
              loading={isSubmitting}
              type="submit"
            >
              Add Phone Number
            </LoadingButton>
          </DialogFooter>
        </div>
      </DialogContent>
    );
};

export default NewNumberDialog;
