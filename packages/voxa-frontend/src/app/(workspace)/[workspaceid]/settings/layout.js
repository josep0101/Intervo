import { Title } from "@/components/ui/title";
import Sidebar from "./Sidebar";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

export const metadata = {
  title: "Workspace Settings",
};

export default function RootLayout({ children }) {
  return (
    <WorkspaceProvider>
      <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-6 p-2">
        <Title>
          Settings
          <p className="text-muted-foreground text-lg mt-1 font-normal tracking-normal">
            Manage your account settings, billing and more.
          </p>
        </Title>
        <div className="flex w-full max-md:flex-col">
          <Sidebar />
          <div className="w-9/12 max-md:w-full">{children}</div>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
