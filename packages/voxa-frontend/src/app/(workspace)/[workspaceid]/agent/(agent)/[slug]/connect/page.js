"use client";
import { Title } from "@/components/ui/title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConnectCRM from "./ConnectCRM";
import React, { useEffect, useState } from "react";
import { usePlayground } from "@/context/AgentContext";
import Deployment from "./Deployment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.jsx";
import { LockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";

export const runtime = "edge";

// Skeleton UI for tabs
const TabSkeleton = () => {
  return (
    <Card className="p-6 rounded-lg animate-pulse">
      <div className="flex flex-col gap-1.5 pb-6">
        <div className="h-7 w-32 bg-gray-200 rounded-md"></div>
        <div className="h-4 w-64 bg-gray-100 rounded-md mt-1"></div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-gray-100 rounded-md"></div>
          <div className="h-16 bg-gray-100 rounded-md"></div>
        </div>
        <div className="mt-4">
          <div className="h-5 w-24 bg-gray-200 rounded-md mb-2"></div>
          <div className="h-40 bg-gray-100 rounded-md"></div>
          <div className="h-5 w-40 bg-gray-200 rounded-md mt-5 mb-2"></div>
          <div className="flex gap-2 items-center mb-2">
            <div className="h-10 bg-gray-100 rounded-md flex-grow"></div>
            <div className="h-10 w-12 bg-gray-100 rounded-md"></div>
          </div>
          <div className="h-4 w-56 bg-gray-100 rounded-md"></div>
        </div>
      </div>
    </Card>
  );
};

const Page = ({ params }) => {
  const { slug, workspaceid } = React.use(params);
  const router = useRouter();

  const [connectionInfo, setConnectionInfo] = useState({});
  const [webhookDetails, setWebhookDetails] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { getConnectionInfo, getWebhookDetails, aiConfig, fetchAIConfig } =
    usePlayground();
  console.log(aiConfig.published, aiConfig, "published");
  const isPublished = aiConfig?.published;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Check if aiConfig exists and fetch it if needed
        if (
          !aiConfig ||
          Object.keys(aiConfig).length === 0 ||
          aiConfig._id !== slug
        ) {
          await fetchAIConfig(slug);
        }

        const connectionData = await getConnectionInfo(slug);
        setConnectionInfo(connectionData);
        const webhookData = await getWebhookDetails(slug);
        setWebhookDetails(webhookData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug, getConnectionInfo, getWebhookDetails, aiConfig, fetchAIConfig]);

  return (
    <div className="container mx-auto max-w-custom py-8 px-6 flex flex-col items-start gap-6">
      <Title>
        Connect
        <p className="text-muted-foreground text-base mt-1 font-normal tracking-normal">
          Configure integrations to use your AI agent in websites, applications,
          and third-party systems.
        </p>
      </Title>
      <div className="flex justify-center w-full">
        <Tabs defaultValue="deployment" className="w-[600px] relative">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger
              value="deployment"
              className="font-medium font-sans leading-6 text-sm px-3 py-1.5"
            >
              Deployment
            </TabsTrigger>
            <TabsTrigger
              value="webhook"
              className="font-medium font-sans leading-6 text-sm px-3 py-1.5"
            >
              Webhook
            </TabsTrigger>
          </TabsList>

          {!isLoading && aiConfig && !isPublished && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md mt-12">
              <Alert className="max-w-md border-primary/20 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <LockIcon className="h-5 w-5 text-primary static" />
                  <AlertTitle className="text-foreground font-medium text-lg m-0">
                    Publish Required
                  </AlertTitle>
                </div>
                <AlertDescription className="text-muted-foreground">
                  Your agent needs to be published before you can access
                  deployment features. Publishing makes your agent accessible
                  through widgets, APIs, and webhooks.
                </AlertDescription>
                <div className="mt-3">
                  <a
                    href={`/${workspaceid}/agent/${slug}/playground`}
                    className="text-primary hover:underline text-sm font-medium cursor-pointer"
                  >
                    Go to Playground →
                  </a>
                </div>
              </Alert>
            </div>
          )}

          <TabsContent value="deployment">
            {!isPublished ? (
              <TabSkeleton />
            ) : (
              <Deployment
                data={connectionInfo}
                aiConfig={aiConfig}
                workspaceId={workspaceid}
                agentId={slug}
              />
            )}
          </TabsContent>
          <TabsContent value="webhook">
            {!isPublished ? (
              <TabSkeleton />
            ) : (
              <ConnectCRM slug={slug} webhookDetails={webhookDetails} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Page;
