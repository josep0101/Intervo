"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Briefcase,
  Users,
  Building,
  Headset,
  ChartBar,
  Book,
  Plus,
} from "lucide-react";

const OnboardingDialog = ({ open, onOpenChange }) => {
  const router = useRouter();
  const { userProfile, updateUserProfile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: userProfile?.role || "",
    companySize: userProfile?.companySize || "",
    useCase: userProfile?.useCase || "",
    goals: userProfile?.goals || "",
    source: userProfile?.source || [],
    personalRole: userProfile?.personalRole || "",
    interest: userProfile?.interest || "",
    companyName: userProfile?.companyName || "",
    companyType: userProfile?.companyType || "",
  });

  const handleSelectOption = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleCheckbox = (field, value) => {
    setFormData((prev) => {
      const currentValues = prev[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [field]: newValues,
      };
    });
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return !!formData.useCase;
      case 2:
        return formData.source && formData.source.length > 0;
      case 3:
        if (formData.useCase === "personal") {
          return !!formData.personalRole && !!formData.interest;
        } else {
          return (
            !!formData.companyName &&
            !!formData.companySize &&
            !!formData.companyType
          );
        }
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    if (!isStepValid()) return;

    setLoading(true);
    try {
      await updateUserProfile({
        ...formData,
        onboardingCompleted: true,
      });

      // Redirect to studio
      if (activeWorkspace?.id) {
        router.push(`/${activeWorkspace.id}/studio`);
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (isStepValid()) {
      if (step === 3) {
        handleComplete();
      } else {
        setStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  // Common header component for steps that use the same header
  const StepHeader = () => (
    <>
      <DialogTitle className="text-2xl font-semibold text-center text-card-foreground tracking-[-0.6px] leading-8 mb-2">
        Let&apos;s customize your experience
      </DialogTitle>
      <p className="text-sm text-muted-foreground text-center font-normal leading-5 mb-6">
        We have a few questions to help us personalize your experience
      </p>
    </>
  );

  // Navigation buttons component
  const NavigationButtons = ({ showBack = true, isLastStep = false }) => (
    <div className="flex gap-3 w-full">
      {showBack ? (
        <Button onClick={handleBack} variant="outline" className="flex-1">
          Back
        </Button>
      ) : null}
      <Button
        onClick={handleNext}
        disabled={!isStepValid() || loading}
        className={showBack ? "flex-1" : "w-full"}
      >
        {loading
          ? "Processing..."
          : isLastStep
          ? "Finish setting up"
          : "Continue"}
      </Button>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col items-center">
            <StepHeader />

            <p className="text-sm font-medium leading-5 text-foreground self-start mb-3">
              What will you use voxa.ai for?
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div
                className={`flex flex-col items-center justify-center min-h-[80px] p-3 border rounded-lg cursor-pointer transition-all hover:border-primary gap-2 flex-1 ${
                  formData.useCase === "work"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200"
                }`}
                onClick={() => handleSelectOption("useCase", "work")}
              >
                <Briefcase className="h-6 w-6" />
                <span className="text-sm font-medium">Work</span>
              </div>

              <div
                className={`flex flex-col items-center justify-center min-h-[80px] p-3 border rounded-lg cursor-pointer transition-all hover:border-primary gap-2 flex-1 ${
                  formData.useCase === "personal"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200"
                }`}
                onClick={() => handleSelectOption("useCase", "personal")}
              >
                <User className="h-6 w-6" />
                <span className="text-sm font-medium">Personal</span>
              </div>
            </div>

            <NavigationButtons showBack={false} />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center">
            <StepHeader />

            <p className="text-sm font-medium leading-5 text-foreground self-start mb-3">
              Where did you hear about us?
            </p>

            <div className="flex flex-col gap-3 w-full mb-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="twitter"
                  checked={formData.source?.includes("twitter")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleToggleCheckbox("source", "twitter");
                    } else {
                      handleToggleCheckbox("source", "twitter");
                    }
                  }}
                />
                <label
                  htmlFor="twitter"
                  className="text-sm font-medium leading-5 cursor-pointer"
                >
                  X (Twitter)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reddit"
                  checked={formData.source?.includes("reddit")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleToggleCheckbox("source", "reddit");
                    } else {
                      handleToggleCheckbox("source", "reddit");
                    }
                  }}
                />
                <label
                  htmlFor="reddit"
                  className="text-sm font-medium leading-5 cursor-pointer"
                >
                  Reddit
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="linkedin"
                  checked={formData.source?.includes("linkedin")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleToggleCheckbox("source", "linkedin");
                    } else {
                      handleToggleCheckbox("source", "linkedin");
                    }
                  }}
                />
                <label
                  htmlFor="linkedin"
                  className="text-sm font-medium leading-5 cursor-pointer"
                >
                  LinkedIn
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="youtube"
                  checked={formData.source?.includes("youtube")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleToggleCheckbox("source", "youtube");
                    } else {
                      handleToggleCheckbox("source", "youtube");
                    }
                  }}
                />
                <label
                  htmlFor="youtube"
                  className="text-sm font-medium leading-5 cursor-pointer"
                >
                  Youtube
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="codedesign"
                  checked={formData.source?.includes("codedesign")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleToggleCheckbox("source", "codedesign");
                    } else {
                      handleToggleCheckbox("source", "codedesign");
                    }
                  }}
                />
                <label
                  htmlFor="codedesign"
                  className="text-sm font-medium leading-5 cursor-pointer"
                >
                  CodeDesign
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="other"
                  checked={formData.source?.includes("other")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleToggleCheckbox("source", "other");
                    } else {
                      handleToggleCheckbox("source", "other");
                    }
                  }}
                />
                <label
                  htmlFor="other"
                  className="text-sm font-medium leading-5 cursor-pointer"
                >
                  Other
                </label>
              </div>
            </div>

            <NavigationButtons />
          </div>
        );
      case 3:
        return formData.useCase === "personal" ? (
          <div className="flex flex-col items-center">
            <StepHeader />

            <div className="w-full mb-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-5 text-foreground">
                  What describes yourself
                </label>
                <Select
                  value={formData.personalRole}
                  onValueChange={(value) =>
                    handleSelectOption("personalRole", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="hobbyist">Hobbyist</SelectItem>
                    <SelectItem value="researcher">Researcher</SelectItem>
                    <SelectItem value="educator">Educator</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-5 text-foreground">
                  What best describes your interest?
                </label>
                <Select
                  value={formData.interest}
                  onValueChange={(value) =>
                    handleSelectOption("interest", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seeking for AI chat agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voice_assistant">
                      Building a voice assistant
                    </SelectItem>
                    <SelectItem value="chatbot">
                      Creating an AI chatbot
                    </SelectItem>
                    <SelectItem value="automation">
                      Automating personal tasks
                    </SelectItem>
                    <SelectItem value="learning">
                      Learning about AI/ML
                    </SelectItem>
                    <SelectItem value="hobby_project">
                      Building a hobby project
                    </SelectItem>
                    <SelectItem value="research">Personal research</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <NavigationButtons showBack={true} isLastStep={true} />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <StepHeader />

            <div className="w-full mb-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-5 text-foreground">
                  Business Name
                </label>
                <Input
                  type="text"
                  placeholder="Company name"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-5 text-foreground">
                  Your team size
                </label>
                <Select
                  value={formData.companySize}
                  onValueChange={(value) =>
                    handleSelectOption("companySize", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="10-30" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="2-10">2-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-1000">201-1000</SelectItem>
                    <SelectItem value="1000+">1000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-5 text-foreground">
                  What best describes your company?
                </label>
                <Select
                  value={formData.companyType}
                  onValueChange={(value) =>
                    handleSelectOption("companyType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Tech Startup</SelectItem>
                    <SelectItem value="saas">SaaS Company</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="service">Service Provider</SelectItem>
                    <SelectItem value="education">
                      Educational Institution
                    </SelectItem>
                    <SelectItem value="nonprofit">Non-profit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <NavigationButtons showBack={true} isLastStep={true} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent className="sm:max-w-[400px] p-6 overflow-y-auto">
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
