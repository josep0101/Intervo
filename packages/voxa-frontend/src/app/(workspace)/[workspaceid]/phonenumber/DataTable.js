"use client";
import { Bot, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DataTable({
  data,
  handleUnlink,
  setChangeAgentDialog,
  setModifyEntryData,
}) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
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
      accessorKey: "countryCode",
      header: "Country Code",
      cell: ({ row }) => <div>{row.getValue("countryCode")}</div>,
    },
    {
      accessorKey: "agent",
      header: ({ column }) => (
        <div
          className="flex items-center space-x-2 hover:cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Agent</span>
          <ArrowUpDown className="w-4 h-4" />
        </div>
      ),
      cell: ({ row }) => {
        const agent = row.getValue("agent");
        return (
          <div className="flex items-center space-x-2">
            <div className="rounded-full bg-secondary p-2">
              <Bot className="text-ring" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                {agent?.name}
              </p>
              <p className="text-sm text-zinc-950">{agent?.agentType}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phoneNumber",
      header: ({ column }) => (
        <div
          className="flex items-center space-x-2 hover:cursor-pointer"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Phone Number</span>
          <ArrowUpDown className="min-w-4 min-h-4" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex">{row.getValue("phoneNumber")}</div>
      ),
    },
    {
      accessorKey: "price",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("price"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);

        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      id: "_id",
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
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setChangeAgentDialog(true);
                  setModifyEntryData((prev) => ({
                    ...prev,
                    _id: row.getValue("_id"),
                  }));
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUnlink(row.getValue("_id"))}
                className="text-destructive hover:bg-destructive hover:text-white"
              >
                Unlink
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data,
    columns: columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-[#F1F5F9]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="py-3 max-sm:text-xs text-muted-foreground text-sm font-medium font-sans leading-6"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ maxWidth: "400px" }}
                      className="px-0 max-w-[400px]"
                    >
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
      {/* Pagination */}
      <div className="flex justify-between">
        <p className="text-muted-foreground flex items-center text-sm leading-6 font-sans">
          {Object.keys(rowSelection).length} of {data.length} row(s) selected.
        </p>
        <div className="flex items-center space-x-2 py-4">
          <Button
            className="bg-white py-1.5 px-2 border border-border text-primary/[.5]"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            className="bg-white py-1.5 px-2 border border-border text-primary/[.5]"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
