"use client";
import Container from "@/components/ui/Container";
import { Title } from "@/components/ui/title";
import Sidebar from "./Sidebar";
import Sources from "./Sources";
import { useSource } from "@/context/SourceContext";
import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";

const Layout = ({ children, params }) => {
  const router = useRouter();
  const { slug } = React.use(params);
  const { workspaceId } = useWorkspace();
  const { setSourceId } = useSource();
  const [sourceType, setSourceType] = useState("file");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSourceId(slug);
    setIsLoading(false);
  }, [slug, setSourceId]);

  const linkData = { file: "/", faq: "faq", website: "website", text: "text" };

  if (isLoading)
    return (
      <Container>
        <Title>
          Source
          <p className="text-muted-foreground text-lg mt-1 font-normal tracking-normal">
            Manage Knowledge Base
          </p>
        </Title>
        Loading...
      </Container>
    );
  else
    return (
      <Container>
        <Title>
          Source
          <p className="text-muted-foreground text-lg mt-1 font-normal tracking-normal">
            Upload files, text and crawl websites to create a knowledge base.
          </p>
        </Title>
        <div className="md:hidden w-full">
          <Select
            onValueChange={(value) => {
              setSourceType(value);
              router.push(`/${workspaceId}/source/${slug}/${linkData[value]}`);
            }}
            defaultValue="file"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Knowledge Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="file">File</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-12 gap-4 font-inter w-full">
          <div className="col-span-3 hidden md:block">
            <Sidebar slug={slug} setSourceType={setSourceType} />
          </div>

          <div className="col-span-12 md:col-span-5">{children}</div>

          <div className="col-span-12 md:col-span-4">
            <Sources sourceType={sourceType} />
          </div>
        </div>
      </Container>
    );
};

export default Layout;
