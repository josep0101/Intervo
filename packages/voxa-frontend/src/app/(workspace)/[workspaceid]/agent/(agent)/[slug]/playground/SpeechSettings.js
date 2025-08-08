import { useEffect, useState, useMemo, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AudioLines } from "lucide-react";
import { usePlayground } from "@/context/AgentContext";

export default function SpeechSettings() {
  const { setAIConfig, aiConfig = {}, updateAIConfig } = usePlayground();
  const [formState, setFormState] = useState(aiConfig);

  // Separate refs to track initialization for each useEffect
  const responseThresholdInitialized = useRef(false);
  const lexicalEnhancementInitialized = useRef(false);

  const speechSettings = useMemo(
    () => [
      "ambientAudio",
      "responseThreshold",
      "conversationalFeedback",
      "utteranceOptimization",
      "lexicalEnhancement",
      "sttSettings",
    ],
    []
  );

  useEffect(() => {
    const currentSettings = Object.fromEntries(
      speechSettings.map((key) => [key, formState[key]])
    );

    const prevSettings = Object.fromEntries(
      speechSettings.map((key) => [key, aiConfig[key]])
    );

    if (JSON.stringify(currentSettings) !== JSON.stringify(prevSettings)) {
      setAIConfig({ ...aiConfig, ...currentSettings });
    }
  }, [formState, aiConfig, speechSettings]);

  //=============== responseThreshold change
  const [responseThreshold, setResponseThreshold] = useState(
    formState.interactionSettings?.responseThreshold
  );
  const handleResponseThresholdChange = (value) => {
    setResponseThreshold(value / 100);

    setFormState((prev) => ({
      ...prev,
      interactionSettings: {
        ...prev.interactionSettings,
        responseThreshold: value / 100,
      },
    }));
  };

  useEffect(() => {
    // Skip on initial render
    if (!responseThresholdInitialized.current) {
      responseThresholdInitialized.current = true;
      return;
    }

    const pushData = setTimeout(() => {
      if (
        responseThreshold === aiConfig?.interactionSettings?.responseThreshold
      ) {
        return;
      }

      let currentSettings = Object.fromEntries(
        speechSettings
          .slice(0, 5)
          .map((key) => [key, formState.interactionSettings[key]])
      );
      currentSettings.responseThreshold = responseThreshold;
      updateAIConfig({
        interactionSettings: currentSettings,
      });
    }, 500);

    return () => clearTimeout(pushData);
  }, [responseThreshold]);

  //================= Lexical Enhancement
  const [lexicalEnhancement, setLexicalEnhancement] = useState(
    formState.interactionSettings?.lexicalEnhancement
  );

  const handleLexicalEnhancementChange = (value) => {
    if (value === "") {
      setLexicalEnhancement({
        terms: [],
        enabled: false,
      });
    } else {
      setLexicalEnhancement({
        terms: value.split(","),
        enabled: true,
      });
    }
  };

  useEffect(() => {
    // Skip on initial render
    if (!lexicalEnhancementInitialized.current) {
      lexicalEnhancementInitialized.current = true;
      return;
    }

    const pushData = setTimeout(() => {
      if (
        lexicalEnhancement === aiConfig?.interactionSettings?.lexicalEnhancement
      ) {
        return;
      }

      let currentSettings = Object.fromEntries(
        speechSettings
          .slice(0, 5)
          .map((key) => [key, formState.interactionSettings[key]])
      );
      currentSettings.lexicalEnhancement = lexicalEnhancement;
      updateAIConfig({
        interactionSettings: currentSettings,
      });
    }, 500);

    return () => clearTimeout(pushData);
  }, [lexicalEnhancement]);

  //================= RawTranscriptionMode change
  const handleRawTranscriptionModeChange = (value) => {
    updateAIConfig({
      sttSettings: {
        service: aiConfig.sttSettings.service,
        rawTranscriptionMode: value,
      },
    });
    setFormState((prev) => ({
      ...prev,
      sttSettings: {
        ...prev.sttSettings,
        rawTranscriptionMode: value,
      },
    }));
  };

  const handleStateChange = (value, field) => {
    let currentSettings = Object.fromEntries(
      speechSettings
        .slice(0, 5)
        .map((key) => [key, formState.interactionSettings[key]])
    );
    currentSettings[field] = value;
    updateAIConfig({
      interactionSettings: currentSettings,
    });

    const newState = {
      ...formState,
      interactionSettings: {
        ...formState.interactionSettings,
        [field]: value,
      },
    };

    setFormState(newState);
  };

  return (
    <Card className="p-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <AudioLines className="w-6 h-6" />
        <span className="text-md font-semibold">Interaction</span>
      </div>

      <Separator />

      {/* //Ambient Audio
      <div className="space-y-2">
        <Label className="font-semibold">Ambient Audio</Label>
        <Select
          onValueChange={(value) => handleStateChange(value, "ambientAudio")}
          value={formState.interactionSettings?.ambientAudio || "None"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="Background1">Ambient Soundscape 1</SelectItem>
            <SelectItem value="Background2">Ambient Soundscape 2</SelectItem>
          </SelectContent>
        </Select>
      </div> */}

      {/* Response Threshold */}
      <div className="space-y-2">
        <Label className="font-semibold">Response Threshold</Label>
        <p className="text-sm text-muted-foreground">
          Adjust the AI&apos;s responsiveness to voice input interruptions
          during dialogue.
        </p>
        <Slider
          value={[responseThreshold * 100 || 50]}
          onValueChange={(value) => handleResponseThresholdChange(value[0])}
          max={100}
          step={1}
          className="w-full"
        />
      </div>

      {/* Conversational Feedback */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-semibold">Conversational Feedback</Label>
          <p className="text-sm text-muted-foreground">
            Enables natural dialogue indicators through brief verbal
            acknowledgments during user speech.
          </p>
        </div>
        <Switch
          checked={
            formState.interactionSettings?.conversationalFeedback || false
          }
          onCheckedChange={(value) =>
            handleStateChange(value, "conversationalFeedback")
          }
        />
      </div>

      {/* Lexical Enhancement */}
      <div className="space-y-2">
        <Label className="font-semibold">Lexical Enhancement</Label>
        <p className="text-sm text-muted-foreground">
          Integrate domain-specific terminology to optimize speech recognition
          accuracy.
        </p>
        <Input
          placeholder="Enter specialized terms separated by commas: Algorithm,Protocol"
          value={lexicalEnhancement?.terms.join(",") || ""}
          onChange={(e) => handleLexicalEnhancementChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Utterance Optimization */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-semibold">Utterance Optimization</Label>
          <p className="text-sm text-muted-foreground">
            Automatically standardizes numerical values, currency notation, and
            temporal references for natural speech output.
          </p>
        </div>
        <Switch
          checked={
            formState.interactionSettings?.utteranceOptimization || false
          }
          onCheckedChange={(value) =>
            handleStateChange(value, "utteranceOptimization")
          }
        />
      </div>

      {/* Raw Transcription Mode */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-semibold">Raw Transcription Mode</Label>
          <p className="text-sm text-muted-foreground">
            Preserves literal transcription output without automatic formatting
            adjustments.
          </p>
        </div>
        <Switch
          checked={formState.sttSettings?.rawTranscriptionMode || false}
          onCheckedChange={(value) => handleRawTranscriptionModeChange(value)}
        />
      </div>
    </Card>
  );
}
