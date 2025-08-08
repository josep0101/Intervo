import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useRef, useState, useMemo } from "react";
import DataTable from "./DataTable";
import { LoadingButton } from "@/components/ui/loadingButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Fuse from "fuse.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import returnAPIUrl from "@/config/config";
import { usePlayground } from "@/context/AgentContext";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const backendAPIUrl = returnAPIUrl();
//const backendAPIUrl = "http://localhost:3003";

const VoiceDialog = () => {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("elevenlabs");
  const [voice, setVoice] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paginationData, setPaginationData] = useState({
    offset: 0,
    limit: 7,
  });
  const [filters, setFilters] = useState({
    language: "en",
    gender: "",
    accent: "",
  });

  const [playingIndex, setPlayingIndex] = useState(null);
  const audioRef = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { aiConfig, setAIConfig, assignVoiceToAgent } = usePlayground();

  const fetchData = async (service) => {
    setIsLoading(true);
    try {
      // Build query params including filters - always include language=en
      const queryParams = new URLSearchParams({
        limit: paginationData.limit,
        offset: paginationData.offset,
        language: "en", // Always send English
        ...(filters.gender && { gender: filters.gender }),
        ...(filters.accent &&
          filters.accent !== "any" && { accent: filters.accent }),
      }).toString();

      const response = await fetch(
        `${backendAPIUrl}/get-voices/service/${service}?${queryParams}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch voices: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format");
      }

      // Transform the data to match the expected structure
      const transformedVoices = Array.isArray(data.voices)
        ? data.voices.map((voice) => ({
            ...voice,
            traits: [voice.gender, voice.accent, voice.language].filter(
              Boolean
            ),
          }))
        : [];

      setItems(transformedVoices);
    } catch (error) {
      console.error("Error fetching voice data:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = async () => {
    setIsSubmitting(true);
    try {
      // Ensure service information is included in the voice object while preserving ALL properties
      const voiceWithService = {
        ...voice,
        service: selectedTab,
        // Ensure we have all the essential properties for display
        voiceName: voice.voiceName || voice.voice_name,
        voiceId: voice.voiceId || voice.voice_id,
        audioUrl: voice.audioUrl || voice.audio_url || voice.previewUrl,
        traits:
          voice.traits ||
          [voice.gender, voice.accent, voice.language].filter(Boolean),
      };

      console.log(voiceWithService, "voiceWithService");
      await assignVoiceToAgent(aiConfig?._id, voiceWithService);
      setAIConfig({ ...aiConfig, ttsSettings: voiceWithService });
      // Stop any playing audio before closing dialog
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingIndex(null);
      }
      // Optionally add a success toast:
      // toast({ title: "Voice assigned successfully" });
      setDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error("Failed to assign voice:", error);
      toast({
        variant: "destructive",
        title: "Failed to assign voice",
        description: "Please try again.",
      });
      // Keep dialog open on error
    } finally {
      setIsSubmitting(false); // Ensure loader stops in both success and error cases
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    // For language, always keep it as "en"
    if (key === "language") {
      return; // Do nothing, keep it as English
    }

    setFilters((prev) => ({ ...prev, [key]: value }));
    // Reset pagination when filters change
    setPaginationData((prev) => ({ ...prev, offset: 0 }));
  };

  // Only fetch data when the dialog is opened, when pagination changes, or when filters change
  useEffect(() => {
    if (dialogOpen) {
      fetchData(selectedTab);
    }
  }, [dialogOpen, selectedTab, paginationData, filters]);

  // Handle pre-selected voice when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      // Check for pre-selected voice from aiConfig
      const preSelectedVoice = aiConfig?.ttsSettings;

      console.log(preSelectedVoice, aiConfig, "preSelectedVoice");

      if (preSelectedVoice) {
        // Only auto-switch tabs on initial dialog open, not on manual tab changes
        if (
          isInitialLoad &&
          preSelectedVoice.service &&
          preSelectedVoice.service !== selectedTab
        ) {
          setSelectedTab(preSelectedVoice.service);
        }

        // Try to find the full voice data from current items to get missing properties
        const voiceId = preSelectedVoice.voiceId || preSelectedVoice.voice_id;
        const fullVoiceData = items.find(
          (item) => item.voiceId === voiceId || item.voice_id === voiceId
        );

        // Merge pre-selected voice with full data if available, otherwise use pre-selected as is
        const completeVoice = fullVoiceData
          ? { ...fullVoiceData, ...preSelectedVoice } // Full data first, then override with saved settings
          : preSelectedVoice;

        setVoice(completeVoice);
      }

      // Mark that initial load is complete
      setIsInitialLoad(false);
    } else {
      // Reset initial load flag when dialog closes
      setIsInitialLoad(true);
    }
  }, [dialogOpen, aiConfig?.ttsSettings, items, isInitialLoad, selectedTab]);

  const fuseOptions = {
    keys: ["voiceName"],
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

  const handleDialogClose = (isOpen) => {
    setDialogOpen(isOpen);
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setPlayingIndex(null);
    }
  };

  const handleTabChange = async (tabName) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setPlayingIndex(null);
    }
    setSelectedTab(tabName);
    await fetchData(tabName);
  };

  // Sort data to show selected voice at the top
  const displayData = useMemo(() => {
    const data = isSearching && filtered.length >= 0 ? filtered : items;

    console.log(voice, data, "voice");
    // If we have a selected voice, ensure it's always visible at the top
    if (voice?.voiceId || voice?.voice_id) {
      const voiceId = voice.voiceId || voice.voice_id;

      // Check if the selected voice is already in the current data
      const selectedVoiceIndex = data.findIndex(
        (item) => item.voiceId === voiceId || item.voice_id === voiceId
      );

      if (selectedVoiceIndex >= 0) {
        // // Selected voice is in current data - move it to top
        // const selectedVoice = data[selectedVoiceIndex];
        // const otherVoices = data.filter(
        //   (_, index) => index !== selectedVoiceIndex
        // );
        // return [selectedVoice, ...otherVoices];
      } else {
        // Selected voice is NOT in current data - add it to the top only if it belongs to current service
        if (voice.service === selectedTab) {
          return [voice, ...data];
        }
      }
    }

    return data;
  }, [items, filtered, isSearching, voice, selectedTab]);

  return (
    <Dialog
      className="min-w-[848px]"
      open={dialogOpen}
      onOpenChange={handleDialogClose}
    >
      <DialogTrigger className="flex mr-auto items-center justify-between gap-2 px-4 py-2 text-primary rounded-md text-sm leading-6 font-medium font-sans bg-white border border-border">
        <span>
          {aiConfig?.ttsSettings?.voiceName
            ? `Selected Voice: ${
                aiConfig?.ttsSettings?.voiceName.split(" - ")[0]
              }`
            : "Select Voice"}
        </span>
        <ChevronDown className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="min-w-[848px]">
        <DialogTitle className="text-lg leading-7 font-sans font-semibold">
          Select Voice
        </DialogTitle>
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabChange("elevenlabs")}
            className={`py-2 px-4 text-sm font-semibold border-b-2 ${
              selectedTab === "elevenlabs"
                ? "text-black border-black"
                : "text-gray-500 border-transparent"
            }`}
          >
            Eleven Labs
          </button>
          <button
            onClick={() => handleTabChange("azure")}
            className={`py-2 px-4 text-sm font-semibold border-b-2 ${
              selectedTab === "azure"
                ? "text-black border-black"
                : "text-gray-500  border-transparent"
            }`}
          >
            Azure Voice
          </button>
        </div>

        <div className="flex justify-between">
          <Input
            className="text-sm leading-5 text-muted-foreground bg-white py-2 px-3 border border-input truncate w-[384px] h-[36px] rounded-md"
            placeholder="Phone Number/Agent"
            onChange={(e) => handleSearchInputChange(e.target.value)}
          />
          <div className="flex gap-2">
            <Select
              defaultValue="en"
              onValueChange={(value) => handleFilterChange("language", value)}
            >
              <SelectTrigger className="flex justify-between items-center gap-2">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <div className="py-2 px-2 text-xs text-muted-foreground italic">
                  More languages coming soon
                </div>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => handleFilterChange("gender", value)}
            >
              <SelectTrigger className="flex justify-between items-center gap-2">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => handleFilterChange("accent", value)}
            >
              <SelectTrigger className="flex justify-between items-center gap-2">
                <SelectValue placeholder="Accent" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="american">American</SelectItem>
                <SelectItem value="australian">Australian</SelectItem>
                <SelectItem value="british">British</SelectItem>
                <SelectItem value="canadian">Canadian</SelectItem>
                <SelectItem value="indian">Indian</SelectItem>
                <SelectItem value="irish">Irish</SelectItem>
                <SelectItem value="jamaican">Jamaican</SelectItem>
                <SelectItem value="new zealand">New Zealand</SelectItem>
                <SelectItem value="nigerian">Nigerian</SelectItem>
                <SelectItem value="scottish">Scottish</SelectItem>
                <SelectItem value="south african">South African</SelectItem>
                <SelectItem value="singaporean">Singaporean</SelectItem>
                <SelectItem value="boston">Boston</SelectItem>
                <SelectItem value="chicago">Chicago</SelectItem>
                <SelectItem value="new york">New York</SelectItem>
                <SelectItem value="us southern">US Southern</SelectItem>
                <SelectItem value="us midwest">US Midwest</SelectItem>
                <SelectItem value="us northeast">US Northeast</SelectItem>
                <SelectItem value="cockney">Cockney</SelectItem>
                <SelectItem value="geordie">Geordie</SelectItem>
                <SelectItem value="scouse">Scouse</SelectItem>
                <SelectItem value="welsh">Welsh</SelectItem>
                <SelectItem value="yorkshire">Yorkshire</SelectItem>
                <SelectItem value="arabic">Arabic</SelectItem>
                <SelectItem value="bulgarian">Bulgarian</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
                <SelectItem value="croatian">Croatian</SelectItem>
                <SelectItem value="czech">Czech</SelectItem>
                <SelectItem value="danish">Danish</SelectItem>
                <SelectItem value="dutch">Dutch</SelectItem>
                <SelectItem value="filipino">Filipino</SelectItem>
                <SelectItem value="finnish">Finnish</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="greek">Greek</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="indonesian">Indonesian</SelectItem>
                <SelectItem value="italian">Italian</SelectItem>
                <SelectItem value="japanese">Japanese</SelectItem>
                <SelectItem value="korean">Korean</SelectItem>
                <SelectItem value="malay">Malay</SelectItem>
                <SelectItem value="polish">Polish</SelectItem>
                <SelectItem value="portuguese">Portuguese</SelectItem>
                <SelectItem value="romanian">Romanian</SelectItem>
                <SelectItem value="russian">Russian</SelectItem>
                <SelectItem value="slovak">Slovak</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="swedish">Swedish</SelectItem>
                <SelectItem value="tamil">Tamil</SelectItem>
                <SelectItem value="turkish">Turkish</SelectItem>
                <SelectItem value="ukrainian">Ukrainian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          data={displayData}
          selectedVoice={voice}
          setVoice={(selectedVoice) => {
            console.log(selectedVoice, "selectedVoice");
            // Ensure service information is always included when setting a voice
            setVoice({ ...selectedVoice, service: selectedTab });
          }}
          audioRef={audioRef}
          playingIndex={playingIndex}
          setPlayingIndex={setPlayingIndex}
          pageData={paginationData}
          setPageData={setPaginationData}
          isLoading={isLoading}
        />

        <DialogFooter className="justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-background text-primary border border-border h-10 hover:text-white"
            >
              Close
            </Button>
          </DialogClose>

          <LoadingButton
            className="px-3 py-2 bg-primary rounded-md text-sm leading-6 font-medium font-sans"
            onClick={() => handleClick()}
            loading={isSubmitting}
            type="submit"
          >
            Use Voice
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceDialog;
