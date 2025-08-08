import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { LuFile, LuTrash2 } from "react-icons/lu";
import { useSource } from "@/context/SourceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SUPPORTED_FILE_TYPES = [
  "application/pdf", // pdf
  "application/msword", // doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain", // txt
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 5MB in bytes

const validateFile = (file) => {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not supported. Please upload PDF, DOC, DOCX, or TXT files only.`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds 10MB limit. Current size: ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)}MB`,
    };
  }
  return { isValid: true };
};

const FileSkeleton = () => (
  <li className="flex items-center justify-between py-1 rounded-lg">
    <div className="flex items-center space-x-2">
      <Skeleton className="h-5 w-[200px]" />
    </div>
    <Skeleton className="h-6 w-6 rounded-md" />
  </li>
);

const FilesDialogSection = ({ onEdit }) => {
  const [highlighted, setHighlighted] = useState(false);
  const [allFiles, setAllFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const {
    updateSourceFile,
    fetchSourceFiles,
    deleteSourceFile,
    deleteSourceFiles,
    sourceId,
  } = useSource();

  // Fetch initial files when component mounts
  useEffect(() => {
    const fetchFiles = async () => {
      if (!sourceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetchSourceFiles(sourceId);
        const files = await response?.files;
        setAllFiles(files || []);

        // Track initial file load
        if (onEdit) {
          onEdit({
            type: "files_loaded",
            count: files?.length || 0,
            files: files || [],
          });
        }
      } catch (error) {
        toast({
          title: "Error fetching files",
          description: error.message,
          variant: "destructive",
        });

        // Track error loading files
        if (onEdit) {
          onEdit({
            type: "files_load_error",
            error: error.message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [sourceId, fetchSourceFiles, toast]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setHighlighted(true);
  };

  const handleDragLeave = () => setHighlighted(false);

  const handleDrop = async (e) => {
    e.preventDefault();
    setHighlighted(false);
    const droppedFiles = Array.from(e.dataTransfer.files);

    // Track file drop event
    if (onEdit) {
      onEdit({
        type: "files_dropped",
        count: droppedFiles.length,
        fileTypes: droppedFiles.map((f) => f.type),
      });
    }

    // Validate each file
    const validFiles = [];
    const invalidFiles = [];

    droppedFiles.forEach((file) => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ name: file.name, error: validation.error });
      }
    });

    invalidFiles.forEach((file) => {
      toast({
        title: `Error with file "${file.name}"`,
        description: file.error,
        variant: "destructive",
      });
    });

    // Track validation results
    if (onEdit && (validFiles.length > 0 || invalidFiles.length > 0)) {
      onEdit({
        type: "files_validated",
        validCount: validFiles.length,
        invalidCount: invalidFiles.length,
        validFiles: validFiles.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
        invalidFiles: invalidFiles,
      });
    }

    if (validFiles.length > 0) {
      try {
        toast({ title: "Uploading file(s)...", variant: "success" });

        // Track upload start
        if (onEdit) {
          onEdit({
            type: "files_saving_started",
          });
        }

        const res = await updateSourceFile(sourceId, validFiles);
        if (res.error) {
          toast({ title: res.error, variant: "destructive" });

          // Track upload error
          if (onEdit) {
            onEdit({
              type: "files_upload_error",
              error: res.error,
            });
          }
        } else {
          toast({
            title: res.message || "Files uploaded successfully",
            variant: "success",
          });
          setAllFiles(res.files || []);

          // Track upload success
          if (onEdit) {
            onEdit({
              type: "files_upload_complete",
              count: res.files?.length || 0,
              newFiles:
                res.files?.filter(
                  (f) => !allFiles.some((af) => af.filename === f.filename)
                ) || [],
            });
          }
        }
      } catch (error) {
        toast({
          title: "Error uploading files",
          description: error.message,
          variant: "destructive",
        });

        // Track unexpected error
        if (onEdit) {
          onEdit({
            type: "files_upload_unexpected_error",
            error: error.message,
          });
        }
      } finally {
        if (onEdit) {
          onEdit({
            type: "files_saving_completed",
          });
        }
      }
    }
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);

    // Track files selected event
    if (onEdit) {
      onEdit({
        type: "files_selected",
        count: selectedFiles.length,
        fileTypes: selectedFiles.map((f) => f.type),
      });
    }

    // Validate each file
    const validFiles = [];
    const invalidFiles = [];

    selectedFiles.forEach((file) => {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ name: file.name, error: validation.error });
      }
    });

    // Show error messages for invalid files
    invalidFiles.forEach((file) => {
      toast({
        title: `Error with file "${file.name}"`,
        description: file.error,
        variant: "destructive",
      });
    });

    // Track validation results
    if (onEdit && (validFiles.length > 0 || invalidFiles.length > 0)) {
      onEdit({
        type: "files_validated",
        validCount: validFiles.length,
        invalidCount: invalidFiles.length,
        validFiles: validFiles.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
        invalidFiles: invalidFiles,
      });
    }

    // Upload valid files to backend
    if (validFiles.length > 0) {
      try {
        toast({ title: "Uploading file(s)...", variant: "success" });

        // Track upload start
        if (onEdit) {
          onEdit({
            type: "files_saving_started",
          });
        }

        const res = await updateSourceFile(sourceId, validFiles);
        if (res.error) {
          toast({ title: res.error, variant: "destructive" });

          // Track upload error
          if (onEdit) {
            onEdit({
              type: "files_upload_error",
              error: res.error,
            });
          }
        } else {
          toast({
            title: res.message || "Files uploaded successfully",
            variant: "success",
          });
          setAllFiles(res.files || []);

          // Track upload success
          if (onEdit) {
            onEdit({
              type: "files_upload_complete",
              count: res.files?.length || 0,
              newFiles:
                res.files?.filter(
                  (f) => !allFiles.some((af) => af.filename === f.filename)
                ) || [],
            });
          }
        }
      } catch (error) {
        toast({
          title: "Error uploading files",
          description: error.message,
          variant: "destructive",
        });

        // Track unexpected error
        if (onEdit) {
          onEdit({
            type: "files_upload_unexpected_error",
            error: error.message,
          });
        }
      } finally {
        if (onEdit) {
          onEdit({
            type: "files_saving_completed",
          });
        }
      }
    }
  };

  const handleSelectFile = (filename) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }

      // Track selection change
      if (onEdit) {
        onEdit({
          type: "files_selection_changed",
          selectedCount: newSet.size,
          action: newSet.has(filename) ? "selected" : "deselected",
          filename: filename,
        });
      }

      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    // Track delete started
    if (onEdit) {
      onEdit({
        type: "files_delete_started",
        count: selectedFiles.size,
        filenames: Array.from(selectedFiles),
      });
    }

    try {
      toast({ title: "Removing selected files...", variant: "success" });
      const res = await deleteSourceFiles(sourceId, Array.from(selectedFiles));

      if (res.error) {
        toast({ title: res.error, variant: "destructive" });

        // Track delete error
        if (onEdit) {
          onEdit({
            type: "files_delete_error",
            error: res.error,
            filenames: Array.from(selectedFiles),
          });
        }
      } else {
        toast({ title: "Files deleted successfully", variant: "success" });
        // Update the UI by removing deleted files
        setAllFiles(
          allFiles.filter((file) => !selectedFiles.has(file.filename))
        );

        // Track delete success
        if (onEdit) {
          onEdit({
            type: "files_delete_complete",
            count: selectedFiles.size,
            deletedFiles: Array.from(selectedFiles),
          });
        }

        setSelectedFiles(new Set());
      }
    } catch (error) {
      toast({
        title: "Error deleting files",
        description: error.message,
        variant: "destructive",
      });

      // Track unexpected error
      if (onEdit) {
        onEdit({
          type: "files_delete_unexpected_error",
          error: error.message,
          filenames: Array.from(selectedFiles),
        });
      }
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center flex items-center flex-col cursor-pointer min-h-[100px]",
          highlighted
            ? "border-blue-500 bg-accent"
            : "border-muted-foreground bg-accent"
        )}
        onClick={() => document.getElementById("dialogFileInput").click()}
      >
        <p className="text-foreground/[.6] text-sm font-medium italic mt-0.5">
          Drag & drop files here, or click to select files
        </p>
        <p className="text-muted-foreground text-xs italic">
          Supported File Types: PDF, DOC, DOCX, TXT (Max size: 5MB)
        </p>
        <input
          type="file"
          id="dialogFileInput"
          multiple
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="min-h-[100px] w-full rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-64 mb-4" />
            <ul className="space-y-2">
              {[1, 2, 3].map((i) => (
                <FileSkeleton key={i} />
              ))}
            </ul>
          </div>
        </div>
      ) : allFiles?.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-sm text-foreground">
                Attached Files
              </h3>
              <p className="text-muted-foreground text-xs my-2">
                Here are all the files uploaded to this source.
              </p>
            </div>
            {selectedFiles.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                className="flex items-center gap-2"
              >
                <LuTrash2 className="h-4 w-4" />
                Delete Selected ({selectedFiles.size})
              </Button>
            )}
          </div>
          <ul className="space-y-2 max-h-[300px] overflow-y-auto">
            {allFiles?.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedFiles.has(file.filename)}
                    onCheckedChange={() => handleSelectFile(file.filename)}
                  />
                  <span className="text-foreground text-sm">
                    {file.filename}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="rounded-full bg-muted/50 p-3">
            <LuFile className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-foreground">
            No files uploaded yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Upload FAQs, product documentation, customer service scripts, or
            call transcripts to enhance your AI&apos;s knowledge
          </p>
        </div>
      )}
    </div>
  );
};

export default FilesDialogSection;
