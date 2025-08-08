"use client";
import { MoreHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

export default function DataTable({
  data,
  pagination,
  setPage,
  page,
  handleClickEdit,
  handleClickDelete,
}) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    var year = date.toLocaleString("default", { year: "numeric" });
    var month = date.toLocaleString("default", { month: "2-digit" });
    var day = date.toLocaleString("default", { day: "2-digit" });
    return `${year}-${month}-${day}`;
  };

  const [rowSelection, setRowSelection] = useState({});
  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          className="ml-4 mb-0.5"
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          className="ml-4 mb-0.5"
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: "Email ↑",
      cell: ({ row }) => (
        <div className="font-sans text-sm">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <div className="font-sans capitalize text-xs leading-4 font-semibold">
          <span className="px-2.5 py-0.5 rounded-full border border-border">
            {row.getValue("role")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status");
        return (
          <div
            className={`inline-flex capitalize items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${
              status === "active"
                ? "bg-[#16A34A] text-[#F8FAFC]"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {status}
          </div>
        );
      },
    },
    {
      accessorKey: "added",
      header: "Added",
      cell: ({ row }) => (
        <div className="font-sans text-sm">
          {formatDate(row.getValue("added"))}
        </div>
      ),
    },
    {
      id: "actions",
      accessorKey: "_id",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="focus:outline-none">
              <button className="flex justify-center items-center h-full w-full">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[196px]">
              <DropdownMenuItem onClick={() => handleClickEdit(row.original)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleClickDelete(row.original)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data,
    columns,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleRowClick = (row) => {
    setRowSelection({ [row.id]: true });
  };

  return (
    <div className="w-full">
      <div className="rounded-md border font-sans leading-5 text-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="py-3 px-1 text-muted-foreground text-sm font-medium leading-6 font-sans"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  data-state={rowSelection[row.id] && "selected"}
                  className={`!hover:bg-gray-300 cursor-pointer ${
                    rowSelection[row.id] && "bg-[#E2E8F0]"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-1 py-3 h-14">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between">
        <p className="text-muted-foreground flex items-center text-sm leading-6 font-sans">
          {Object.keys(rowSelection).length} of {data.length} row(s) selected.
        </p>
        <div className="flex items-center space-x-2 py-4">
          <Button
            className="bg-white py-1.5 px-2 border border-border text-primary hover:text-white"
            onClick={() => setPage(page - 1)}
            disabled={pagination?.currentPage === 1}
          >
            Previous
          </Button>
          <Button
            className="bg-white py-1.5 px-2 border border-border text-primary hover:text-white"
            onClick={() => setPage(page + 1)}
            disabled={pagination?.currentPage === pagination?.totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
