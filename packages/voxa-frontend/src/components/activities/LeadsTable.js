"use client";
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useMemo } from "react";
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

export default function DataTable({ data, pagination, setPage, page }) {
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  // Memoize columns
  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "fullName",
        header: "Full Name",
        cell: ({ row }) => {
          const firstName = row.original.firstName || "";
          const lastName = row.original.lastName || "";
          return `${firstName} ${lastName}`.trim();
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <div
            className="flex items-center space-x-2 hover:cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Email</span>
            <ArrowUpDown className="max-w-4 w-full h-full max-h-4" />
          </div>
        ),
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone",
      },
      {
        accessorKey: "country",
        header: "Country",
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <div
            className="flex items-center space-x-2 hover:cursor-pointer"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Created Date</span>
            <ArrowUpDown className="max-w-4 w-full h-full max-h-4" />
          </div>
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return date
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .toLowerCase();
        },
      },
      {
        accessorKey: "source",
        header: "Source",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [] // Empty dependency array since column config is static
  );

  // Memoize the table instance
  const table = useReactTable({
    data: data?.contacts || [],
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full flex flex-col h-full">
      {/* Table with scrollable body */}
      <div className="rounded-md border flex-1 flex flex-col overflow-x-auto">
        <Table>
          <TableHeader className="bg-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-6 sm:px-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="overflow-auto">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="h-14">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 sm:px-4">
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
                  className="text-center py-10 px-6 sm:px-4"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex justify-between py-4 bg-white border-t">
        <p className="text-muted-foreground flex items-center text-sm leading-6 font-sans">
          {Object.keys(rowSelection).length} of {data.length} row(s) selected.
        </p>
        <div className="flex items-center space-x-2">
          <Button
            className="bg-white py-1.5 px-2 border border-border text-black hover:text-white"
            onClick={() => setPage(page - 1)}
            disabled={pagination?.currentPage === 1}
          >
            Previous
          </Button>
          <Button
            className="bg-white py-1.5 px-2 border border-border text-black hover:text-white"
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
