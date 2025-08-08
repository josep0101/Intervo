"use client";
export const runtime = "edge";

import { useCallback, useEffect, useState } from "react";
import DataTable from "./DataTable";
import { Input } from "@/components/ui/input";
import Fuse from "fuse.js";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { usePhoneNumber } from "@/context/PhoneNumberContext";
import NewNumberDialog from "./NewNumberDialog";
import { usePlayground } from "@/context/AgentContext";
import EditAgentDialog from "./EditAgentDialog";
import { useWorkspace } from "@/context/WorkspaceContext";
import PhoneNumberSetupPopup from "./PhoneNumberSetupPopup";
import { Skeleton } from "@/components/ui/skeleton";

const Page = () => {
  const {
    getUserNumbers,
    unlinkPhoneNumber,
    removeAgent,
    assignAgent,
    getTemporaryNumbers,
    getPurchasedTwilioNumbers,
  } = usePhoneNumber();
  const { workspaceInfo } = useWorkspace();
  const [filtered, setFiltered] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [changeAgentDialog, setChangeAgentDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [setupPopupOpen, setSetupPopupOpen] = useState(false);
  const [hasAvailableNumbers, setHasAvailableNumbers] = useState(false);
  const { getAllAgents } = usePlayground();
  const [agents, setAgents] = useState([]);
  const [isChangingAgent, setIsChangingAgent] = useState(false);
  const [modifyEntryData, setModifyEntryData] = useState({});

  // Check if setup requirements are met
  const isTwilioConnected = workspaceInfo?.twilioSID && workspaceInfo?.apiKey;
  const shouldShowSetupPopup = !isTwilioConnected || !hasAvailableNumbers;

  const fetchPhoneNumbersAndAgents = useCallback(async () => {
    const res = await getUserNumbers();
    const userAgents = await getAllAgents();
    const filteredNumbers = res.userNumbers.filter(
      (number) => number.agent !== null
    );
    setAgents(userAgents);
    setItems(filteredNumbers);
  }, [getUserNumbers, getAllAgents]);

  // Check for available phone numbers (same logic as popup)
  const checkAvailableNumbers = useCallback(async () => {
    if (!workspaceInfo) return; // Wait for workspace info to load

    setIsCheckingSetup(true);
    try {
      const temporaryNumbers = await getTemporaryNumbers();
      const purchasedTwilioNumbers = await getPurchasedTwilioNumbers();

      const availableNumbers = [
        temporaryNumbers,
        ...(purchasedTwilioNumbers.length > 0 ? purchasedTwilioNumbers : []),
      ].filter((item) => item);

      setHasAvailableNumbers(availableNumbers.length > 0);
    } catch (error) {
      console.error("Error checking available phone numbers:", error);
      setHasAvailableNumbers(false);
    } finally {
      setIsCheckingSetup(false);
    }
  }, [workspaceInfo]);

  useEffect(() => {
    setIsLoading(true);
    fetchPhoneNumbersAndAgents().finally(() => {
      setIsLoading(false);
    });
  }, [fetchPhoneNumbersAndAgents]);

  useEffect(() => {
    checkAvailableNumbers();
  }, []);

  // Show setup popup after checking if requirements aren't met
  useEffect(() => {
    if (!isCheckingSetup && shouldShowSetupPopup) {
      setSetupPopupOpen(true);
    }
  }, [isCheckingSetup, shouldShowSetupPopup]);

  const fuseOptions = {
    keys: ["agent", "phone"],
  };

  const handleSearchInputChange = (searchTerm) => {
    if (searchTerm === "") {
      setIsSearching(false);
      setFiltered([]);
      return;
    }
    setIsSearching(true);
    const fuse = new Fuse(items, fuseOptions);
    const results = fuse.search(searchTerm);
    setFiltered(results.map((entry) => entry.item));
  };

  const handleUnlink = (_id) => {
    setItems(items.filter((item) => item._id !== _id));
    unlinkPhoneNumber(_id);
  };

  const handleModifyAgent = async () => {
    setIsChangingAgent(true);
    await removeAgent(modifyEntryData._id);
    await assignAgent({
      phoneNumber: { _id: modifyEntryData._id },
      agentId: modifyEntryData.agentId,
    });
    fetchPhoneNumbersAndAgents();
    setIsChangingAgent(false);
    setChangeAgentDialog(false);
  };

  // Show skeleton loader while checking setup conditions
  if (isLoading || isCheckingSetup) {
    return (
      <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-4 p-2">
        <div className="flex justify-between max-sm:flex-col gap-2 items-center w-full">
          <Skeleton className="h-8 w-[263px] max-sm:w-full" />
          <Skeleton className="h-8 w-[120px] max-sm:w-full" />
        </div>
        <div className="w-full">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-4 p-2">
      <div className="flex justify-between max-sm:flex-col gap-2 items-center w-full">
        <Input
          className="text-sm leading-5 text-muted-foreground bg-white py-2 px-3 border border-input truncate max-sm:w-full sm:w-[263px] h-8 rounded-md"
          placeholder="Phone Number/Agent"
          onChange={(e) => handleSearchInputChange(e.target.value)}
        />
        {/* New phone number dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex justify-center items-center gap-1 px-3 py-2 bg-primary max-sm:w-full h-8 rounded-md text-sm leading-6 font-medium font-sans text-primary-foreground">
            <Plus className="h-4 w-4" /> New Number
          </DialogTrigger>
          <NewNumberDialog
            setOpen={setOpen}
            open={open}
            setItems={setItems}
            items={items}
            agents={agents}
          />
        </Dialog>
        {/* Edit phone number (change agent) dialog */}
        <Dialog open={changeAgentDialog} onOpenChange={setChangeAgentDialog}>
          <EditAgentDialog
            agents={agents}
            isChangingAgent={isChangingAgent}
            setModifyEntryData={setModifyEntryData}
            handleModifyAgent={handleModifyAgent}
          />
        </Dialog>
      </div>

      <DataTable
        data={isSearching && filtered.length >= 0 ? filtered : items}
        handleUnlink={handleUnlink}
        setChangeAgentDialog={setChangeAgentDialog}
        setModifyEntryData={setModifyEntryData}
      />

      {/* Setup Requirements Popup - Only show when conditions are not met */}
      {shouldShowSetupPopup && (
        <PhoneNumberSetupPopup
          open={setupPopupOpen}
          onOpenChange={setSetupPopupOpen}
        />
      )}
    </div>
  );
};

export default Page;
