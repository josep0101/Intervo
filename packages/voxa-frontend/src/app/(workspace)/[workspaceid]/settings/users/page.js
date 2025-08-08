"use client";
export const runtime = "edge";

import React, { useEffect, useMemo, useState } from "react";
import DataTable from "./DataTable";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import Fuse from "fuse.js";
import { Plus } from "lucide-react";
import NewUserDialog from "./NewUserDialog";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";

const Page = () => {
  const { toast } = useToast();
  const [filtered, setFiltered] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState();
  const [pagination, setPagination] = useState({});
  const { fetchWorkspaceUsers, deleteWorkspaceUser } = useWorkspace();
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetchWorkspaceUsers(page);
        if (res.error) {
          toast({ title: res.error, variant: "destructive" });
          return;
        }
        setUsers(res?.users);
        setPagination(res?.pagination);
      } catch (error) {
        toast({
          variant: "destructive",
          title: error,
        });
      }
    };

    fetchUsers();
  }, [page, fetchWorkspaceUsers, toast]);

  const fuseOptions = {
    keys: ["email", "role", "status"],
  };

  const handleSearchInputChange = (searchTerm) => {
    if (searchTerm === "") {
      setIsSearching(false);
      setFiltered([]);
      return;
    }
    setIsSearching(true);
    const fuse = new Fuse(users, fuseOptions);
    const results = fuse.search(searchTerm);
    setFiltered(results.map((entry) => entry.item));
  };

  const handleClickEdit = (user) => {
    setEditingUser(user);
    console.log(users);
    setOpen(true);
  };

  const handleClickDelete = async (user) => {
    const res = await deleteWorkspaceUser({
      email: user.email,
      role: user.role,
    });
    if (res.error) {
      toast({ title: res.error, variant: "destructive" });
      return;
    }
    setUsers(users.filter((u) => u.email !== user.email));
    toast({ title: res.message, variant: "success" });
  };

  return (
    <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-4 p-2">
      <div className="flex justify-between max-sm:flex-col gap-2 items-center w-full">
        <Input
          className="text-sm leading-5 text-muted-foreground bg-white py-2 px-3 border border-input truncate max-sm:w-full sm:w-[263px] h-9 rounded-md"
          placeholder="Search Users"
          onChange={(e) => handleSearchInputChange(e.target.value)}
        />
        <Dialog
          open={open}
          onOpenChange={(open) => {
            if (open) {
              setEditingUser();
            }
            setOpen(open);
          }}
        >
          <DialogTrigger className="flex justify-center items-center gap-1 px-3 py-2 bg-primary max-sm:w-full h-10 rounded-md text-sm leading-6 font-medium font-sans text-primary-foreground">
            <Plus className="h-4 w-4" /> Add user
          </DialogTrigger>
          <NewUserDialog
            setOpen={setOpen}
            open={open}
            setUsers={setUsers}
            users={users}
            editingUser={editingUser}
          />
        </Dialog>
      </div>
      <DataTable
        data={isSearching && filtered.length >= 0 ? filtered : users}
        pagination={pagination}
        page={page}
        setPage={setPage}
        handleClickEdit={handleClickEdit}
        handleClickDelete={handleClickDelete}
      />
    </div>
  );
};

export default Page;
