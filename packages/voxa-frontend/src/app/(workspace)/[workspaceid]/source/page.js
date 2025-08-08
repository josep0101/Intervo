import { redirect } from "next/navigation";

export const runtime = "edge";
const Page = async ({ params }) => {
  redirect(`/${(await params).workspaceid}/studio`);
};

export default Page;
