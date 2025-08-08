"use client";
// import "../styles/main.scss";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { PlaygroundProvider } from "@/context/AgentContext";
import { SourceProvider } from "@/context/SourceContext";
import { SiteHeader } from "@/components/navbar/site-header";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePathname } from "next/navigation";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { PostHogProvider as PostHogTrackingProvider } from "@/context/PostHogContext";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isAgentRoute = pathname?.includes("/agent/");

  return (
    <PostHogProvider>
      <AuthProvider>
        <PostHogTrackingProvider>
          <ProtectedRoute>
            <WorkspaceProvider>
              <SourceProvider>
                <PlaygroundProvider>
                  <div className="flex flex-col gap-6">
                    {!isAgentRoute && <SiteHeader />}
                    {children}
                  </div>
                  <Toaster />
                </PlaygroundProvider>
              </SourceProvider>
            </WorkspaceProvider>
          </ProtectedRoute>
        </PostHogTrackingProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}
