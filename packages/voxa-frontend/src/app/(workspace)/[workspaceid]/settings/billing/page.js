"use client";

export const runtime = "edge";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Overview from "./Overview";
import { TooltipProvider } from "@/components/ui/tooltip";
import BillingHistory from "./BillingHistory";
import PaymentMethods from "./PaymentMethods";
import { useSearchParams } from "next/navigation";

const BillingPage = () => {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const currentTab = [
    "overview",
    "payment-methods",
    "billing-history",
  ].includes(tab)
    ? tab
    : "overview";

  return (
    <div className="container py-6">
      <Tabs key={currentTab} defaultValue={currentTab} className="w-full">
        <TabsList className="inline-flex h-9 items-center text-muted-foreground w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            className="inline-flex items-center justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            value="overview"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            className="inline-flex items-center justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            value="payment-methods"
          >
            Payment Methods
          </TabsTrigger>
          <TabsTrigger
            className="inline-flex items-center justify-center whitespace-nowrap py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            value="billing-history"
          >
            Billing History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0">
          <TooltipProvider>
            <Overview />
          </TooltipProvider>
        </TabsContent>

        <TabsContent value="payment-methods">
          <PaymentMethods />
        </TabsContent>

        <TabsContent value="billing-history">
          <BillingHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingPage;
