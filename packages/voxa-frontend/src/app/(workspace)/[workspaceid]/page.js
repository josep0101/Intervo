import { redirect } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

export const metadata = {
  title: "Studio", // This will use the template from your root app/layout.js
  // and become "Voxa - Studio"
};

export const runtime = "edge";
const Page = async ({ params }) => {
  redirect(`/${(await params).workspaceid}/studio`);
  return <></>;
};

export default Page;
