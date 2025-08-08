"use client";
import { MoreHorizontal, Download, ExternalLink } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

// Helper function to format Stripe amount (cents to dollars/currency)
const formatStripeAmount = (amount, currency) => {
  // If amount is already formatted by backend (like the example), adjust accordingly
  // Assuming it IS formatted based on example `amount_paid: 15.00`
  if (amount === undefined || amount === null || !currency) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch (e) {
    console.error("Error formatting Stripe amount:", e);
    return "Invalid Price";
  }
};

// Helper function to format Unix timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  try {
    // Multiply by 1000 to convert seconds to milliseconds
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short", // Use short month name
      day: "numeric",
    });
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "Invalid Date";
  }
};

export default function BillingHistoryTable({
  invoices,
  isLoading,
  pagination,
  loadNextPage,
}) {
  // Define columns based on actual invoice data
  const columns = useMemo(
    () => [
      {
        accessorKey: "created",
        header: "Date",
        cell: ({ row }) => (
          <div className="font-sans text-sm">
            {formatTimestamp(row.original.created)}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          let variant = "outline";
          if (status === "paid") variant = "success";
          else if (status === "open") variant = "secondary";
          else if (status === "void" || status === "uncollectible")
            variant = "destructive";
          return (
            <Badge variant={variant} className="capitalize">
              {status?.replace("_", " ") || "N/A"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "amount_paid",
        header: "Amount",
        cell: ({ row }) => (
          <div className="font-sans text-sm">
            {formatStripeAmount(
              row.original.amount_paid,
              row.original.currency
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Invoice",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.invoice_pdf && (
              <a
                href={row.original.invoice_pdf}
                target="_blank"
                rel="noopener noreferrer"
                title="Download PDF"
              >
                <Download className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </a>
            )}
            {row.original.hosted_invoice_url && (
              <a
                href={row.original.hosted_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                title="View Invoice Online"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </a>
            )}
          </div>
        ),
      },
    ],
    [] // No external dependencies needed for column definitions themselves
  );

  const table = useReactTable({
    data: invoices ?? [], // Use fetched invoices, default to empty array
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
                    className="py-3 px-2 text-muted-foreground text-sm font-medium leading-6 font-sans"
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
            {isLoading && !invoices?.length ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.original.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-2 py-3 h-14">
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
                  No billing history found.
                </TableCell>
              </TableRow>
            )}
            {isLoading && invoices?.length > 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-10 text-center text-muted-foreground"
                >
                  Loading more...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <div className="flex items-center space-x-2 py-4">
          <Button
            className="bg-white py-1.5 px-2 border border-border text-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={loadNextPage}
            disabled={!pagination?.has_more || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
