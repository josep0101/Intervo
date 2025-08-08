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

const PublishDialog = ({
  open,
  handlePublishAgentClick,
  setPhoneNumber,
  phoneNumber,
}) => {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState([]);
  const { getTemporaryNumbers, getPurchasedTwilioNumbers, assignAgent } =
    usePhoneNumber();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublishAgent = async () => {
    setIsSubmitting(true);
    const res = await assignAgent(phoneNumber);
    if (res.error) {
      toast({ title: res.error, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    handlePublishAgentClick();
    setIsSubmitting(false);
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
      <DialogContent className="w-[512px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Loading...
          </DialogTitle>
        </DialogHeader>
      </DialogContent>
    );
  } else
    return (
      <DialogContent className="w-[512px]">
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
                setPhoneNumber({
                  ...phoneNumber,
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

          <DialogFooter className="justify-end">
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
              onClick={handlePublishAgent}
              loading={isSubmitting}
              type="submit"
            >
              Publish
            </LoadingButton>
          </DialogFooter>
        </div>
      </DialogContent>
    );
};

export default PublishDialog;
