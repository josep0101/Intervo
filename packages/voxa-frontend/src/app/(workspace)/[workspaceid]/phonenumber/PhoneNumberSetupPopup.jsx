import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import { usePhoneNumber } from "@/context/PhoneNumberContext";
import { AlertCircle, Settings, Phone } from "lucide-react";

const PhoneNumberSetupPopup = ({ open, onOpenChange }) => {
  const { workspaceInfo, workspaceId } = useWorkspace();
  const { getUserNumbers, getTemporaryNumbers, getPurchasedTwilioNumbers } =
    usePhoneNumber();
  const router = useRouter();
  const [hasPhoneNumbers, setHasPhoneNumbers] = useState(false);
  const [isCheckingPhoneNumbers, setIsCheckingPhoneNumbers] = useState(true);

  // Check if Twilio is connected
  const isTwilioConnected = workspaceInfo?.twilioSID && workspaceInfo?.apiKey;

  // Check for phone numbers using the same logic as NewNumberDialog
  useEffect(() => {
    const checkPhoneNumbers = async () => {
      if (!open) return;

      setIsCheckingPhoneNumbers(true);
      try {
        const temporaryNumbers = await getTemporaryNumbers();
        const purchasedTwilioNumbers = await getPurchasedTwilioNumbers();

        const availableNumbers = [
          temporaryNumbers,
          ...(purchasedTwilioNumbers.length > 0 ? purchasedTwilioNumbers : []),
        ].filter((item) => item); // Filter out null/undefined items

        setHasPhoneNumbers(availableNumbers.length > 0);
      } catch (error) {
        console.error("Error checking phone numbers:", error);
        setHasPhoneNumbers(false);
      } finally {
        setIsCheckingPhoneNumbers(false);
      }
    };

    checkPhoneNumbers();
  }, [open, getTemporaryNumbers, getPurchasedTwilioNumbers]);

  // Don't show popup if both requirements are met
  const shouldShowPopup = open && (!isTwilioConnected || !hasPhoneNumbers);

  const handleConnectTwilio = () => {
    window.open(`/${workspaceId}/settings/connect`, "_blank");
    onOpenChange(false);
  };

  if (!shouldShowPopup) {
    return null;
  }

  return (
    <Dialog open={shouldShowPopup} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md sm:w-[512px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold font-sans leading-7 text-center flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Setup Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            To use phone number features, you need to complete the following
            setup:
          </div>

          <div className="space-y-3">
            {/* Twilio Connection Status */}
            <div
              className={`flex items-center gap-3 p-3 rounded-md border ${
                isTwilioConnected
                  ? "bg-green-50 border-green-200"
                  : "bg-orange-50 border-orange-200"
              }`}
            >
              <Settings
                className={`h-4 w-4 ${
                  isTwilioConnected ? "text-green-600" : "text-orange-600"
                }`}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {isTwilioConnected ? "✓ Twilio Connected" : "Connect Twilio"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isTwilioConnected
                    ? "Your Twilio account is connected and ready"
                    : "Connect your Twilio account to enable phone features"}
                </div>
              </div>
            </div>

            {/* Phone Number Status */}
            <div
              className={`flex items-center gap-3 p-3 rounded-md border ${
                hasPhoneNumbers
                  ? "bg-green-50 border-green-200"
                  : "bg-orange-50 border-orange-200"
              }`}
            >
              <Phone
                className={`h-4 w-4 ${
                  hasPhoneNumbers ? "text-green-600" : "text-orange-600"
                }`}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {isCheckingPhoneNumbers
                    ? "Checking phone numbers..."
                    : hasPhoneNumbers
                    ? "✓ Phone Numbers Available"
                    : "Get Phone Numbers"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isCheckingPhoneNumbers
                    ? "Please wait..."
                    : hasPhoneNumbers
                    ? "You have phone numbers configured"
                    : "Purchase or configure phone numbers through Twilio"}
                </div>
                {!isCheckingPhoneNumbers && !hasPhoneNumbers && (
                  <div className="mt-2 text-xs">
                    <a
                      href="https://www.twilio.com/docs/phone-numbers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Learn about phone numbers
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {!isTwilioConnected && (
              <Button onClick={handleConnectTwilio} className="w-full">
                Connect Twilio Account
              </Button>
            )}

            {!hasPhoneNumbers && !isCheckingPhoneNumbers && (
              <Button
                onClick={() =>
                  window.open(
                    "https://console.twilio.com/us1/develop/phone-numbers/manage/search",
                    "_blank"
                  )
                }
                className="w-full"
              >
                Go to Twilio Console
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneNumberSetupPopup;
