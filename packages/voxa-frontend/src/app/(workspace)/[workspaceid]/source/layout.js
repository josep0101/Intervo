import { SourceProvider } from "@/context/SourceContext";

export const metadata = {
  title: "Knowledge Base",
};

const layout = ({ children }) => {
  return <SourceProvider>{children}</SourceProvider>;
};

export default layout;
