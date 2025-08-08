"use client";
import { Bot } from "lucide-react";
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import { Copy } from "lucide-react";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Color palettes for aesthetically pleasing random color selections
const colorPalettes = [
  ["6366f1", "818cf8", "a5b4fc", "c7d2fe", "e0e7ff"], // Indigo
  ["ec4899", "f472b6", "f9a8d4", "fbcfe8", "fce7f3"], // Pink
  ["10b981", "34d399", "6ee7b7", "a7f3d0", "d1fae5"], // Emerald
  ["8b5cf6", "a78bfa", "c4b5fd", "ddd6fe", "ede9fe"], // Violet
  ["f59e0b", "fbbf24", "fcd34d", "fde68a", "fef3c7"], // Amber
  ["3b82f6", "60a5fa", "93c5fd", "bfdbfe", "dbeafe"], // Blue
  ["ef4444", "f87171", "fca5a5", "fecaca", "fee2e2"], // Red
  ["8b5cf6", "a78bfa", "c4b5fd", "ddd6fe", "ede9fe"], // Purple
];

// Function to get a random color palette based on the voiceId
const getColorPalette = (voiceId) => {
  // Create a simple hash from the voiceId to ensure the same voice always gets the same colors
  let hash = 0;
  for (let i = 0; i < voiceId.length; i++) {
    hash = (hash << 5) - hash + voiceId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  // Use the absolute value of the hash to select a palette
  const paletteIndex = Math.abs(hash) % colorPalettes.length;
  return colorPalettes[paletteIndex].join(",");
};

export default function DataTable({
  data,
  selectedVoice,
  setVoice,
  audioRef,
  playingIndex,
  setPlayingIndex,
  pageData,
  setPageData,
  isLoading,
}) {
  console.log(selectedVoice, "selectedVoice");

  const { toast } = useToast();

  const togglePlayPause = (index, mp3Url) => {
    console.log(index, mp3Url);
    if (playingIndex === index) {
      audioRef.current.pause();
      setPlayingIndex(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(mp3Url);
      audio.play();
      // Reset play button when audio ends
      audio.onended = () => {
        setPlayingIndex(null);
      };
      audioRef.current = audio;
      setPlayingIndex(index);
    }
  };

  const columns = [
    {
      id: "audioUrl",
      accessorKey: "audioUrl",
      header: ({ table }) => <></>,
      cell: ({ row }) => (
        <div className="flex items-center">
          <div
            onClick={() => togglePlayPause(row.index, row.getValue("audioUrl"))}
            className="bg-black rounded-full w-5 h-5 flex justify-center items-center cursor-pointer"
          >
            {playingIndex === row.index ? (
              <IoPauseSharp className="text-white text-[12px]" />
            ) : (
              <IoPlaySharp className="ml-0.5 text-white text-[12px]" />
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "voiceName",
      header: "Voice Name",
      cell: ({ row }) => {
        const voiceId = row.getValue("voiceId");
        const colorPalette = getColorPalette(voiceId);

        return (
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-sm"></div>
              <Avatar className="h-8 w-8 relative">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${voiceId}&backgroundColor=${colorPalette}&textColor=ffffff`}
                  alt={row.getValue("voiceName")}
                />
                <AvatarFallback className="bg-secondary">
                  {row
                    .getValue("voiceName")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="font-sans text-foreground text-sm leading-5">
              {row.getValue("voiceName")}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "traits",
      header: "Trait",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {row
            .getValue("traits")
            ?.slice(0, 2)
            .map((trait, index) => (
              <Badge key={index} variant="secondary">
                {trait}
              </Badge>
            ))}
        </div>
      ),
    },
    {
      accessorKey: "voiceId",
      header: "Voice ID",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2 group">
          <div className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
            {row.getValue("voiceId")}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(row.getValue("voiceId"));
              toast({
                title: "Copied to clipboard",
                description: "Voice ID has been copied to your clipboard.",
              });
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded-md"
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleRowClick = (row) => {
    setVoice(row.original);
  };

  // Check if a row is selected based on voice ID comparison
  const isRowSelected = (row) => {
    if (!selectedVoice) return false;
    const selectedVoiceId = selectedVoice.voiceId || selectedVoice.voice_id;
    const rowVoiceId = row.original.voiceId || row.original.voice_id;
    return selectedVoiceId === rowVoiceId;
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingIndex(null);
    }
  };

  const handleNextPage = () => {
    stopAudio();
    setPageData({ ...pageData, offset: pageData.offset + pageData.limit });
  };

  const handlePreviousPage = () => {
    if (pageData.offset > 0) {
      stopAudio();
      setPageData({ ...pageData, offset: pageData.offset - pageData.limit });
    }
  };

  return (
    <div className="w-full">
      {/* Table */}
      <div className="rounded-md border overflow-y-scroll max-h-[50vh]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="py-3 px-4 text-muted-foreground text-sm font-medium leading-6 font-sans"
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
            {isLoading ? (
              // Skeleton loader for rows
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-5 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  data-state={isRowSelected(row) && "selected"}
                  className={`hover:bg-muted/50 cursor-pointer transition-colors ${
                    isRowSelected(row) &&
                    "bg-accent border-l-4 border-l-primary"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
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
          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            `${selectedVoice ? 1 : 0} of ${data.length} row(s) selected.`
          )}
        </p>
        <div className="flex items-center space-x-2 py-4">
          <Button
            className="bg-white py-1.5 px-2 border border-border text-primary hover:text-white"
            onClick={handlePreviousPage}
            disabled={isLoading || pageData.offset === 0}
          >
            Previous
          </Button>
          <Button
            className="bg-white py-1.5 px-2 border border-border text-primary hover:text-white"
            onClick={handleNextPage}
            disabled={isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
