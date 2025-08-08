"use client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { usePlayground } from "@/context/AgentContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const ConnectCRM = ({ slug, webhookDetails }) => {
  const { updateWebhook } = usePlayground();
  const { toast } = useToast();
  const [webhookName, setWebhookName] = useState(webhookDetails?.name);
  const [webhookEndpoint, setWebhookEndpoint] = useState(
    webhookDetails?.endpoint
  );
  const [selectedMethod, setSelectedMethod] = useState(webhookDetails?.method);
  const [selectedEvent, setSelectedEvent] = useState(webhookDetails?.event);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await updateWebhook(slug, {
      webhookName: webhookName,
      webhookEndpoint: webhookEndpoint,
      webhookMethod: selectedMethod,
      webhookEvent: selectedEvent,
    });
    toast({
      title: "Webhook Updated",
      variant: "success",
    });
  };

  return (
    <Card className="p-6 rounded-lg">
      <div className="flex flex-col gap-1.5 pb-6">
        <div className="flex items-center gap-2">
          <CardTitle className="font-sans leading-6 text-2xl">
            Webhook Integration
          </CardTitle>
          <Badge
            variant="outline"
            className="text-xs bg-primary/10 text-primary border-primary/20 font-medium uppercase px-2 py-0.5"
          >
            Beta
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground leading-5 font-sans">
          Configure webhooks to notify your systems when new contacts or
          conversations are created.
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-border px-8 py-6 rounded-md gap-4 flex max-sm:flex-col justify-between shadow-lg">
          <div className="text-foreground font-sans text-sm leading-5 flex flex-col gap-1">
            <h5 className="font-semibold">How to integrate with your CRM</h5>
            <span>
              Learn how webhook notifications can update your CRM in real-time.
            </span>
          </div>
          <Button className="my-2 px-3 text-sm font-medium leading-none font-sans bg-transparent text-foreground border border-border">
            Watch (2min)
          </Button>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => handleFormSubmit(e)}
        >
          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm leading-5 font-sans font-medium">
              Webhook Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="E.g., Salesforce Integration"
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm leading-5 font-sans font-medium">
              Webhook Endpoint <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="https://your-crm.example.com/webhook"
              value={webhookEndpoint}
              onChange={(e) => setWebhookEndpoint(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm leading-5 font-sans font-medium">
              HTTP Method <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedMethod}
              onValueChange={(value) => setSelectedMethod(value)}
            >
              <SelectTrigger className="w-full text-foreground">
                <SelectValue placeholder="Select a method" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-foreground text-sm leading-5 font-sans font-medium">
              Trigger Event <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedEvent}
              onValueChange={(value) => setSelectedEvent(value)}
            >
              <SelectTrigger className="w-full text-foreground">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="AI Call Summary">
                    AI Call Summary
                  </SelectItem>
                  <SelectItem value="New Contact Created">
                    New Contact Created
                  </SelectItem>
                  <SelectItem value="Conversation Completed">
                    Conversation Completed
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-2 p-4 bg-secondary/50 border border-border rounded-md">
            <p className="text-sm text-muted-foreground">
              Webhooks allow your systems to be notified when events occur with
              your AI agent. When an event is triggered, we&apos;ll send a HTTP
              request to your endpoint with detailed information.
            </p>
          </div>

          <Button
            type="submit"
            className="bg-primary text-primary-foreground text-sm leading-6 font-sans font-medium h-10 w-[117px]"
          >
            Save changes
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default ConnectCRM;
