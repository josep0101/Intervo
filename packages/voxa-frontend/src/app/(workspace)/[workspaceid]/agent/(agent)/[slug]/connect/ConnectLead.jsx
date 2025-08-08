"use client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import TextBox from "@/components/textBoxConnect";
import { Badge } from "@/components/ui/badge";

const ConnectLead = ({ data }) => {
  return (
    <Card className="p-6 rounded-lg">
      <div className="flex flex-col gap-1.5 pb-6">
        <div className="flex items-center gap-2">
          <CardTitle className="font-sans leading-6 text-2xl">
            API Access
          </CardTitle>
          <Badge
            variant="outline"
            className="text-xs bg-primary/10 text-primary border-primary/20 font-medium uppercase px-2 py-0.5"
          >
            Beta
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground leading-5 font-sans">
          Use these credentials to initiate AI calls through your application.
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-border px-8 py-6 rounded-md gap-4 flex max-sm:flex-col justify-between shadow-lg">
          <div className="text-foreground font-sans text-sm leading-5 flex flex-col gap-1">
            <h5 className="font-semibold">
              How to integrate AI calls in your application
            </h5>
            <span>
              Learn how to use the API to initiate calls with your AI agent.
            </span>
          </div>
          <Button className="my-2 px-3 text-sm font-medium leading-none font-sans bg-transparent text-foreground border border-border">
            Watch (2min)
          </Button>
        </div>
        <TextBox
          title="Endpoint URL"
          text={data?.url || ""}
          desc="This is the base URL for making API requests to initiate AI calls."
        />
        <TextBox
          title="API Key"
          text={data?.apiKey || ""}
          desc="Your secret API key is required for authentication with the AI calling system."
        />
        <div className="mt-2 p-4 bg-secondary/50 border border-border rounded-md">
          <p className="text-sm text-muted-foreground">
            With these credentials, your application can programmatically
            initiate calls between your AI agent and users. Keep your API key
            secure and never expose it in client-side code.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ConnectLead;
