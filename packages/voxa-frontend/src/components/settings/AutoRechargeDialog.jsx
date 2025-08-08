import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/context/WorkspaceContext.js";
import { creditsToUSD, usdToCredits } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const AutoRechargeDialog = ({ open, onOpenChange }) => {
  const {
    subscriptionDetails,
    updateAutoRechargeSettings,
    fetchWorkspaceInfo,
  } = useWorkspace();
  const { toast } = useToast();

  console.log(subscriptionDetails, "subscriptionDetails");

  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(""); // USD
  const [rechargeAmount, setRechargeAmount] = useState(""); // USD
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && subscriptionDetails?.autoRecharge) {
      const {
        autoRechargeEnabled,
        autoRechargeThresholdCredits,
        autoRechargeAmountToAddCredits,
      } = subscriptionDetails.autoRecharge;

      setEnabled(autoRechargeEnabled || false);
      setThreshold(
        autoRechargeThresholdCredits
          ? creditsToUSD(autoRechargeThresholdCredits)
          : ""
      );
      setRechargeAmount(
        autoRechargeAmountToAddCredits
          ? creditsToUSD(autoRechargeAmountToAddCredits)
          : ""
      );
      setError(null); // Clear previous errors when dialog opens
    } else if (open) {
      // If autoRecharge object doesn't exist, set to defaults or clear
      setEnabled(false);
      setThreshold("");
      setRechargeAmount("");
      setError(null);
    }
  }, [open, subscriptionDetails]);

  const handleAmountChange = (value, setter) => {
    const numericValue = value.replace(/[^\d.]/g, "");
    setter(numericValue);
    if (error) setError(null); // Clear error on input change
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    const thresholdUSD = parseFloat(threshold);
    const rechargeAmountUSD = parseFloat(rechargeAmount);

    // Basic Validations (can be more sophisticated)
    if (enabled) {
      if (isNaN(thresholdUSD) || thresholdUSD < 5 || thresholdUSD > 19995) {
        setError("Threshold must be between $5 and $19,995.");
        setIsLoading(false);
        return;
      }
      if (
        isNaN(rechargeAmountUSD) ||
        rechargeAmountUSD < 10 ||
        rechargeAmountUSD > 200000
      ) {
        setError("Recharge amount must be between $10 and $200,000.");
        setIsLoading(false);
        return;
      }
      if (rechargeAmountUSD <= thresholdUSD) {
        setError("Recharge amount must be greater than the threshold amount.");
        setIsLoading(false);
        return;
      }
    }

    const settingsToUpdate = {
      autoRechargeEnabled: enabled,
    };

    if (enabled) {
      settingsToUpdate.autoRechargeThresholdCredits =
        usdToCredits(thresholdUSD);
      settingsToUpdate.autoRechargeAmountToAddCredits =
        usdToCredits(rechargeAmountUSD);
      settingsToUpdate.autoRechargeChargeAmount =
        usdToCredits(rechargeAmountUSD); // Charge amount in cents, same as recharge amount value
      settingsToUpdate.autoRechargeCurrency = "usd";
    } else {
      // When disabling, send nulls or specific values if backend expects them to clear
      settingsToUpdate.autoRechargeThresholdCredits = null;
      settingsToUpdate.autoRechargeAmountToAddCredits = null;
      settingsToUpdate.autoRechargeChargeAmount = null;
      settingsToUpdate.autoRechargeCurrency = null;
    }

    try {
      await updateAutoRechargeSettings(settingsToUpdate);
      toast({
        title: "Success",
        description: "Auto-recharge settings saved.",
        variant: "success",
      });
      await fetchWorkspaceInfo(); // Re-fetch workspace info to get updated subscriptionDetails
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to save auto-recharge settings:", err);
      setError(err.message || "Failed to save settings. Please try again.");
      toast({
        title: "Error",
        description: err.message || "Could not save settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] font-sans">
        <DialogHeader>
          <DialogTitle>Auto recharge settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 pt-2">
          <Label
            htmlFor="auto-recharge"
            className="text-left mr-auto text-sm leading-5 font-medium"
          >
            Would you like to set up automatic recharge?
          </Label>
          <div className="flex items-center gap-2 w-full">
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked);
                if (!checked) setError(null); // Clear errors if disabling
              }}
              id="auto-recharge"
            />
            <span className="text-sm leading-5 text-muted-foreground flex-1">
              Yes, automatic recharge my card when my credit balance fall below
              a threshold
            </span>
          </div>
        </div>

        {enabled && (
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="threshold"
                className="text-sm leading-5 font-medium"
              >
                When credit goes below
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="threshold"
                  className="pl-7" // Adjusted padding for $ sign
                  placeholder="5.00"
                  type="number" // Use number type for better input handling
                  step="0.01" // Allow decimals
                  value={threshold}
                  onChange={(e) =>
                    handleAmountChange(e.target.value, setThreshold)
                  }
                  disabled={!enabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter an amount between $5.00 and $19,995.00
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="recharge-amount"
                className="text-sm leading-5 font-medium"
              >
                Bring credit balance back up to
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="recharge-amount"
                  className="pl-7" // Adjusted padding for $ sign
                  placeholder="55.00"
                  type="number"
                  step="0.01"
                  value={rechargeAmount}
                  onChange={(e) =>
                    handleAmountChange(e.target.value, setRechargeAmount)
                  }
                  disabled={!enabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter an amount between $10.00 and $200,000.00. Must be greater
                than threshold.
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 pt-2">{error}</p>}

        <div className="flex flex-col gap-2 pt-4 pb-2">
          <Button
            className="h-10"
            onClick={handleSave}
            disabled={isLoading || (enabled && (!threshold || !rechargeAmount))}
          >
            {isLoading ? "Saving..." : "Save settings"}
          </Button>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="h-10 border border-border rounded-md w-full"
              disabled={isLoading}
            >
              Cancel
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoRechargeDialog;
