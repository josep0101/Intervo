import { redirect } from "next/navigation";

export const runtime = "edge";
const Page = async ({ params }) => {
  const { slug, workspaceid } = await params;
  redirect(`/${workspaceid}/agent/${slug}/playground`);
  return <></>;
};

export default Page;
