"use client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import WidgetButton from "./WidgetButton";
import { Braces, Copy, FileCode2 } from "lucide-react";
import { useState } from "react";
import WidgetCodeBlock from "./WidgetCodeBlock";
import { Input } from "@/components/ui/input";
import { usePlayground } from "@/context/AgentContext";
import CustomizeWidgetForm from "./CustomizeWidgetForm";

const Widget = ({ data, aiConfig }) => {
  const [active, setActive] = useState("chatBubble");
  const [copied, setCopied] = useState(false);
  const { configureWidget } = usePlayground();

  const widgetId =
    aiConfig?.widgetId ||
    data?.widgetId ||
    "7706efd1-f279-4439-ad5d-3b645d0aba1e";

  const handleCopy = () => {
    navigator.clipboard.writeText(widgetId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const ChatBubble = () => {
    return (
      <>
        <p className="font-medium text-foreground leading-6 font-sans">
          Configure
        </p>
        <p className="text-sm text-muted-foreground  mb-2">
          Paste this code into the <code>&lt;head&gt;</code> tag of your HTML
          document:
        </p>
        <WidgetCodeBlock
          code={`<script
    src="https://widget.voxa.ai"
    id="voxaLoader"
    data-widget-id="${widgetId}"
    defer>
</script>`}
        />

        <CustomizeWidgetForm
          aiConfig={aiConfig}
          configureWidget={configureWidget}
        />

        {/* 
        IMPORTANT: DO NOT REMOVE THIS SECTION - NEEDED FOR AI REFERENCE
        Original Widget ID section - kept for AI context and potential future use
        
        <p className="font-medium text-foreground leading-6 font-sans mt-5">
          Your Widget ID
        </p>
        <div className="flex flex-col gap-2 text-sm leading-5 font-sans">
          <div className="flex gap-2 items-center">
            <Input
              className="h-10 text-sm leading-5 font-sans font-medium"
              value={widgetId}
              readOnly
            />
            <Button className="border border-border" onClick={handleCopy}>
              {copied ? "Copied!" : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-muted-foreground">
            Your Widget ID is required to initialize the widget on your website.
          </p>
        </div>
        */}

        {/* Identity Verification (Coming Soon)
          <p className="mt-4 font-medium text-foreground leading-6 font-sans">
            For identity verification
          </p>
          <div className="flex gap-2 items-center">
            <Input
              className="h-10 text-muted-foreground text-sm leading-5 font-sans"
              disabled
              value="•••••••••tmki"
            />
            <Button className="border border-border" onClick={handleCopy}>
              Copy
            </Button>
          </div>
          <p className="text-muted-foreground">
            You'll need to generate an HMAC on your server for each
            logged-in user and send it to Voxa.
          </p>
          <p className="mt-4 text-muted-foreground">
            You'll need your secret key to add identity verification to
            your site or app.
          </p>
          <WidgetCodeBlock
            code={`const crypto = require('crypto');

const secret = '•••••••••'; // Your verification secret key
const userId = current_user.id // A string UUID to identify your user

const hash = crypto.createHmac('sha256', secret).update(userId).digest('hex');`}
          />
          */}
      </>
    );
  };

  const Iframe = () => {
    return (
      <>
        <p className="font-medium text-foreground leading-6 font-sans">
          Iframe
        </p>
        <WidgetCodeBlock
          code={`<iframe
    src="https://voxa.ai/chatbot-iframe/${widgetId}"
    width="100%"
    style="height: 100%; min-height: 700px"
    frameborder="0"
></iframe>`}
        />
      </>
    );
  };

  return (
    <Card className="p-6 rounded-lg">
      <div className="flex flex-col gap-1.5 pb-6">
        <CardTitle className="font-sans leading-6 text-xl">
          Website Widget
        </CardTitle>
        <span className="text-sm text-muted-foreground leading-5 font-sans">
          Embed your AI agent on any website to provide conversational
          assistance to your visitors.
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <WidgetButton
            text="Embed a chat Bubble"
            Icon={<FileCode2 className="w-6 h-6" />}
            active={active === "chatBubble"}
            onClick={() => setActive("chatBubble")}
          />
          <WidgetButton
            text={
              <>
                Embed the iframe directly{" "}
                <span className="text-xs text-muted-foreground ml-1">
                  (Coming Soon)
                </span>
              </>
            }
            Icon={<Braces className="w-6 h-6 text-muted-foreground" />}
            active={false}
            onClick={() => setActive("iframe")}
            disabled={true}
          />
        </div>
        {active === "chatBubble" && <ChatBubble />}
        {active === "iframe" && <Iframe />}
      </div>
    </Card>
  );
};

export default Widget;
