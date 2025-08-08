import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loadingButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/context/WorkspaceContext";

const NewUserDialog = ({ setOpen, open, setUsers, users, editingUser }) => {
  const { toast } = useToast();
  const { inviteUserToWorkspace, editWorkspaceUser } = useWorkspace();
  const roles = ["admin", "member"];

  const [newUserData, setNewUserData] = useState({
    email: "",
    role: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!editingUser) {
      const res = await inviteUserToWorkspace(newUserData);
      if (res.error) {
        toast({ title: res.error, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      setUsers([
        ...users,
        { ...newUserData, status: "pending", added: Date() },
      ]);
      toast({ title: "Invite sent successfully", variant: "success" });
    } else {
      const res = await editWorkspaceUser({
        email: editingUser.email,
        role: newUserData.role,
      });
      if (res.error) {
        toast({ title: res.error, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const updatedUsers = users.map((user) =>
        user.email === editingUser.email
          ? { ...user, role: newUserData.role }
          : user
      );
      setUsers(updatedUsers);
      toast({ title: "User updated successfully", variant: "success" });
    }

    setIsSubmitting(false);
    setOpen(false);
    setNewUserData({ email: "", role: "" });
  };

  return (
    <DialogContent className="w-full max-sm:w-[300px] max-w-[512px]">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {editingUser ? "Update User info" : "Add or invite user"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-5 text-foreground font-sans">
            Email address
          </label>
          <Input
            placeholder="example@company.com"
            value={
              newUserData.email
                ? newUserData.email
                : editingUser?.email
                ? editingUser.email
                : ""
            }
            onChange={(e) =>
              setNewUserData({ ...newUserData, email: e.target.value })
            }
            disabled={editingUser}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-5 text-foreground font-sans">
            Role
          </label>
          <Select
            onValueChange={(value) =>
              setNewUserData({ ...newUserData, role: value })
            }
            defaultValue={editingUser && editingUser.role}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map((item, index) => (
                <SelectItem value={item} key={index} className="capitalize">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="justify-end max-sm:flex-col gap-2">
          <DialogClose asChild>
            <Button
              type="button"
              className="bg-background text-primary border border-border h-10"
            >
              Cancel
            </Button>
          </DialogClose>

          <LoadingButton
            className="px-3 py-2 bg-primary rounded-md text-sm leading-6 font-medium font-sans min-w-20"
            onClick={() => handleSubmit()}
            loading={isSubmitting}
            type="submit"
          >
            {editingUser ? "Save" : "Add user to workspace"}
          </LoadingButton>
        </DialogFooter>
      </div>
    </DialogContent>
  );
};

export default NewUserDialog;
