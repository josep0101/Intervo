import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/context/WorkspaceContext";
import { usePhoneNumber } from "@/context/PhoneNumberContext";
import { usePlayground } from "@/context/AgentContext";
import {
  Phone,
  Globe,
  Code,
  Settings,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Widget from "./Widget"; // Import existing Widget component

const Deployment = ({ data, aiConfig, workspaceId, agentId }) => {
  const [selectedDeployment, setSelectedDeployment] = useState("widget");
  const [twilioConnected, setTwilioConnected] = useState(false);
  const [agentHasPhoneNumber, setAgentHasPhoneNumber] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(true);
  const { workspaceInfo } = useWorkspace();
  const { getUserNumbers } = usePhoneNumber();
  const { toast } = useToast();

  // Check Twilio connection
  useEffect(() => {
    const checkTwilio = () => {
      setTwilioConnected(workspaceInfo?.twilioSID && workspaceInfo?.apiKey);
    };
    checkTwilio();
  }, [workspaceInfo]);

  // Check if agent has phone number
  useEffect(() => {
    const checkAgentPhoneNumber = async () => {
      setIsCheckingPhone(true);
      try {
        const res = await getUserNumbers();
        const agentPhoneNumber = res?.userNumbers?.find(
          (number) => number.agent?._id === agentId
        );
        setAgentHasPhoneNumber(!!agentPhoneNumber);
      } catch (error) {
        console.error("Error checking agent phone number:", error);
        setAgentHasPhoneNumber(false);
      } finally {
        setIsCheckingPhone(false);
      }
    };

    if (agentId) {
      checkAgentPhoneNumber();
    }
  }, [agentId, getUserNumbers]);

  const deploymentTypes = [
    {
      value: "widget",
      label: "Website Widget",
      icon: <Globe className="w-4 h-4" />,
    },
    {
      value: "phone",
      label: "Phone Call (via Twilio)",
      icon: <Phone className="w-4 h-4" />,
    },
    {
      value: "api",
      label: "API Integration",
      icon: <Code className="w-4 h-4" />,
    },
    {
      value: "sdk",
      label: "SDK Integration",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied to your clipboard.",
    });
  };

  const renderPhoneDeployment = () => {
    const prerequisites = [
      {
        label: "Twilio Connection",
        status: twilioConnected,
        description: "Connect your Twilio account to enable phone features",
        action: !twilioConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(`/${workspaceId}/settings/connect`, "_blank")
            }
          >
            Configure Twilio
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        ),
      },
      {
        label: "Phone Number Assignment",
        status: agentHasPhoneNumber,
        loading: isCheckingPhone,
        description: "Assign a phone number to this agent",
        action: !agentHasPhoneNumber && !isCheckingPhone && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/${workspaceId}/phonenumber`, "_blank")}
          >
            Manage Phone Numbers
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        ),
      },
    ];

    const allPrerequisitesMet = prerequisites.every((prereq) => prereq.status);
    const uniqueIdentifier = aiConfig?.uniqueIdentifier || agentId;

    return (
      <Card className="p-6">
        <div className="space-y-6">
          {/* Prerequisites Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Prerequisites</h3>
            <div className="space-y-3">
              {prerequisites.map((prereq, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    prereq.status
                      ? "bg-green-50 border-green-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {prereq.loading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : prereq.status ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{prereq.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {prereq.description}
                      </div>
                    </div>
                  </div>
                  {prereq.action}
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps Section */}
          {allPrerequisitesMet && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Phone Call Features
              </h3>
              <div className="space-y-4">
                {/* Incoming Calls */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Incoming Calls
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    When someone calls your assigned phone number, it will be
                    automatically handled by this AI agent.
                  </p>
                  <Badge variant="secondary">Automatically configured</Badge>
                </div>

                {/* Outgoing Calls */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Outgoing Calls API
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use our API to initiate outgoing calls programmatically.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        API ENDPOINT
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono">
                          POST https://api.voxa.ai/workflow/
                          {uniqueIdentifier}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              `https://api.voxa.ai/workflow/${uniqueIdentifier}`
                            )
                          }
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        API KEY
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono">
                          {data?.apiKey || "your-api-key-here"}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            copyToClipboard(data?.apiKey || "your-api-key-here")
                          }
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        EXAMPLE CODE
                      </label>
                      <div className="mt-1">
                        <pre className="p-3 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                          {`curl -X POST \\
  "https://api.voxa.ai/workflow/${uniqueIdentifier}?phoneNumber=%2B1234567890&firstName=John&lastName=Doe&email=john.doe%40example.com&callType=outbound&country=United%20States" \\
  -H "x-api-key: ${data?.apiKey || "your-api-key-here"}" \\
  -H "Content-Type: application/json"`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        JAVASCRIPT EXAMPLE
                      </label>
                      <div className="mt-1">
                        <pre className="p-3 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                          {`const queryParams = new URLSearchParams({
  phoneNumber: '+1234567890',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com', 
  callType: 'outbound',
  country: 'United States'
});

const url = \`https://api.voxa.ai/workflow/${uniqueIdentifier}?\${queryParams}\`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'x-api-key': '${data?.apiKey || "your-api-key-here"}',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log('Call SID:', data.callSid);`}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        RESPONSE FORMAT
                      </label>
                      <div className="mt-1">
                        <pre className="p-3 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                          {`{
  "success": true,
  "message": "Call initiated successfully via workflow API",
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "workflowResponse": {
    "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderAPIDeployment = () => (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">API Integration</h3>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            Integrate your AI agent directly into your applications using our
            REST API.
          </p>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
      </div>
    </Card>
  );

  const renderSDKDeployment = () => (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">SDK Integration</h3>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            Use our JavaScript SDK for seamless integration into your web
            applications.
          </p>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
      </div>
    </Card>
  );

  const renderDeploymentContent = () => {
    switch (selectedDeployment) {
      case "widget":
        return <Widget data={data} aiConfig={aiConfig} />;
      case "phone":
        return renderPhoneDeployment();
      case "api":
        return renderAPIDeployment();
      case "sdk":
        return renderSDKDeployment();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Deploy Your Agent
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want to deploy and integrate your AI agent
        </p>
      </div>

      {/* Deployment Type Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Deployment Type
        </label>
        <Select
          value={selectedDeployment}
          onValueChange={setSelectedDeployment}
        >
          <SelectTrigger className="w-full h-12 text-base">
            <SelectValue placeholder="Select deployment type" />
          </SelectTrigger>
          <SelectContent>
            {deploymentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value} className="h-12">
                <div className="flex items-center gap-3">
                  {type.icon}
                  <span className="font-medium">{type.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deployment Content */}
      <div className="mt-6">{renderDeploymentContent()}</div>
    </div>
  );
};

export default Deployment;
