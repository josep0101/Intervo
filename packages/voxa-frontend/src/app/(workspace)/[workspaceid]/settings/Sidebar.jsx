"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/context/WorkspaceContext";

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { workspaceId } = useWorkspace();

  const navItems = [
    {
      name: "General",
      path: "/",
    },
    {
      name: "Connect Twilio",
      path: "/connect",
    },
    {
      name: "Users",
      path: "/users",
    },
    // {
    //   name: "API Key",
    //   path: "#",
    // },
    {
      name: "Plans",
      path: "/plans",
    },
    {
      name: "Billing",
      path: "/billing",
    },
  ];

  const isSelected = (path) => {
    const path_ = path === "/" ? "" : path;
    if (pathname === `/${workspaceId}/settings${path_}`) return true;
    return false;
  };

  return (
    <div className="md:w-3/12 md:pr-12 mb-4">
      <Select
        onValueChange={(value) => {
          router.push(`/${workspaceId}/settings${value}`);
        }}
        defaultValue="/"
        className="md:hidden"
      >
        <SelectTrigger className="md:hidden">
          <SelectValue placeholder="Select settings" />
        </SelectTrigger>
        <SelectContent>
          {navItems.map((item, index) => (
            <SelectItem value={item.path} key={index}>
              {item.name || ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <nav className="flex gap-2 flex-col max-md:hidden">
        {navItems.map((item, index) => (
          <Link
            key={index}
            href={`/${workspaceId}/settings${item.path}`}
            className="hover:bg-muted rounded-md"
          >
            <button
              className={`rounded-md w-full font-medium items-center flex gap-2 py-2 px-4 ${
                isSelected(item.path) && "bg-[#E2E8F0]"
              }`}
            >
              {item.name}
            </button>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
