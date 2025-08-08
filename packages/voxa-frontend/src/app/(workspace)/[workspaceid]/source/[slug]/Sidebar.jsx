"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FiFile } from "react-icons/fi";
import { LuText } from "react-icons/lu";
import { GoGlobe } from "react-icons/go";
import { LuMessagesSquare } from "react-icons/lu";
import { useWorkspace } from "@/context/WorkspaceContext";

const Sidebar = ({ slug, setSourceType }) => {
  const pathname = usePathname();
  const { workspaceId } = useWorkspace();

  const navItems = [
    {
      name: "Files",
      id: "file",
      path: "",
      icon: <FiFile />,
    },
    {
      name: "Text",
      id: "text",
      path: "/text",
      icon: <LuText />,
    },
    {
      name: "Website",
      id: "website",
      path: "/website",
      icon: <GoGlobe />,
    },
    {
      name: "FAQ",
      id: "faq",
      path: "/faq",
      icon: <LuMessagesSquare />,
    },
  ];

  const isSelected = (path) => {
    if (pathname === `/${workspaceId}/source/${slug}${path}`) return true;
    return false;
  };

  return (
    <nav className="flex gap-2 flex-col">
      {navItems.map((item, index) => (
        <Link
          key={index}
          href={`/${workspaceId}/source/${slug}${item.path}`}
          className="hover:bg-muted rounded-md"
        >
          <button
            className={`rounded-md w-full font-medium items-center flex gap-2 py-2 px-4 ${
              isSelected(item.path) && "bg-muted"
            }`}
            onClick={() => setSourceType(item.name)}
          >
            {item.icon}
            {item.name}
          </button>
        </Link>
      ))}
    </nav>
  );
};

export default Sidebar;
