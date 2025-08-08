// import "../styles/main.scss";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { PlaygroundProvider } from "@/context/AgentContext";
import { SiteHeader } from "@/components/navbar/site-header";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { SourceProvider } from "@/context/SourceContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// The metadata const below is removed.
// export const metadata = { ... };

export default async function RootLayout({ children, params }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ProtectedRoute>
            <WorkspaceProvider>
              <SourceProvider>
                <PlaygroundProvider>
                  <div className="flex flex-col">
                    {!(await params?.slug) && <SiteHeader />}
                    {children}
                  </div>
                  <Toaster />
                </PlaygroundProvider>
              </SourceProvider>
            </WorkspaceProvider>
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
