"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Building2Icon,
  ChartSpline,
  ChevronDownIcon,
  Contact,
  CreditCard,
  LogOut,
  Phone,
  Plus,
  SettingsIcon,
  User,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "../ui/select";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateWorkspaceDialog from "./CreateWorkspaceDialog";

const Dropdown = () => {
  const {
    workspaceInfo,
    workspaceId,
    memberWorkspaces,
    handleWorkspaceChange,
  } = useWorkspace();
  const { logout, user } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="p-2 bg-muted rounded-full">
          <User className="h-6 w-6" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mr-4">
        <DropdownMenuLabel>{workspaceInfo?.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Dialog>
            <DialogTrigger className="flex items-center gap-2 w-full">
              <Plus className="h-4 w-4" />
              New Workspace
            </DialogTrigger>
            <CreateWorkspaceDialog />
          </Dialog>
        </DropdownMenuItem>
        {memberWorkspaces && memberWorkspaces.length > 1 && (
          <>
            <DropdownMenuItem>
              <Select value={workspaceId} onValueChange={handleWorkspaceChange}>
                <SelectTrigger
                  className="w-full h-7 text-foreground outline-none border-none shadow-none focus:ring-0 focus:ring-offset-0 p-0"
                  hideIcon
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      <Building2Icon className="h-4 w-4" />
                      Switch Workspace
                    </div>
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </SelectTrigger>
                <SelectContent side="left" align="start">
                  <SelectGroup>
                    {memberWorkspaces &&
                      memberWorkspaces.map((workspace) => (
                        <SelectItem key={workspace._id} value={workspace._id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem>
          <Link
            href={`/${workspaceId}/studio`}
            className="flex items-center gap-2 w-full"
          >
            <Contact className="h-4 w-4" />
            Agents
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link
            href={`/${workspaceId}/studio?page=knowledgebase`}
            className="flex items-center gap-2 w-full   "
          >
            <BookOpen className="h-4 w-4" />
            Knowledge Base
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link
            href={`/${workspaceId}/phonenumber`}
            className="flex items-center gap-2 w-full"
          >
            <Phone className="h-4 w-4" />
            Phone Numbers
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {workspaceInfo?.user === user?.id && (
          <>
            <DropdownMenuItem>
              <Link
                href={`/${workspaceId}/settings/users`}
                className="flex items-center gap-2 w-full"
              >
                <UsersIcon className="h-4 w-4" />
                Users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                href={`/${workspaceId}/settings/users`}
                className="flex items-center gap-2 w-full"
              >
                <Plus className="h-4 w-4" />
                Invite Users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                href={`/${workspaceId}/usage`}
                className="flex items-center gap-2 w-full"
              >
                <ChartSpline className="h-4 w-4" />
                Usage
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                href={`/${workspaceId}/settings/billing`}
                className="flex items-center gap-2 w-full"
              >
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                href={`/${workspaceId}/settings`}
                className="flex items-center gap-2 w-full"
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem>
          <button onClick={logout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Dropdown;
