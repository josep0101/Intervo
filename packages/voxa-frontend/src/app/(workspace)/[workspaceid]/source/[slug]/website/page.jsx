"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LuTrash2, LuCheck, LuLoader2 } from "react-icons/lu";
import { useToast } from "@/hooks/use-toast";
import { useSource } from "@/context/SourceContext";
import debounce from "lodash.debounce";
import { Skeleton } from "@/components/ui/skeleton";

export const runtime = "edge";

const LinkSkeleton = () => (
  <li className="flex items-center justify-between rounded-lg space-x-2">
    <Skeleton className="h-6 w-[67px] rounded-full" />
    <Skeleton className="flex-grow h-10" />
    <Skeleton className="h-7 w-7 rounded-md" />
  </li>
);

const Page = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isRecrawling, setIsRecrawling] = useState(false);
  const [deletingUrls, setDeletingUrls] = useState(new Set());
  const [urlsToDelete, setUrlsToDelete] = useState(new Set());
  const {
    updateSourceWebsites,
    sourceId,
    fetchSourceWebsites,
    deleteSourceUrls,
    recrawlExistingPages,
    crawlMorePages,
  } = useSource();

  const [links, setLinks] = useState([]);
  const [pendingDeletes, setPendingDeletes] = useState(new Set());

  useEffect(() => {
    const fetchUrls = async () => {
      setIsLoading(true);
      const res = await fetchSourceWebsites(sourceId);
      if (res.error) {
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      setLinks(res.links || []);
      setIsLoading(false);
    };

    fetchUrls();
  }, [sourceId, fetchSourceWebsites, toast]);

  const handleFetchMoreLinks = async () => {
    setIsCrawling(true);
    toast({ title: "Website crawling initiated", variant: "success" });
    const res = await updateSourceWebsites(sourceId, url);
    if (res.error) toast({ title: res.error, variant: "destructive" });
    setLinks(res.links || []);
    setIsCrawling(false);
    toast({ title: "Website crawling complete", variant: "success" });
  };

  const handleRecrawlExisting = async () => {
    setIsRecrawling(true);
    toast({ title: "Recrawling existing pages...", variant: "success" });
    const res = await recrawlExistingPages(sourceId);
    if (res.error) {
      toast({ title: res.error, variant: "destructive" });
      setIsRecrawling(false);
      return;
    }
    setLinks(res.links || []);
    setIsRecrawling(false);
    toast({ title: "Recrawl complete", variant: "success" });
  };

  const handleCrawlMore = async () => {
    setIsCrawling(true);
    toast({ title: "Crawling next set of pages...", variant: "success" });
    const res = await crawlMorePages(sourceId, 10);
    if (res.error) {
      toast({ title: res.error, variant: "destructive" });
      setIsCrawling(false);
      return;
    }
    setLinks(res.data?.links || []);
    setIsCrawling(false);
    toast({ title: "Crawl complete", variant: "success" });
  };

  const handleAddUrl = () => {
    setLinks([{ url: "", status: "Pending", isEditable: true }, ...links]);
  };

  const handleNewUrlChange = (index, newUrl) => {
    setLinks(
      links.map((link, i) => (i === index ? { ...link, url: newUrl } : link))
    );
  };

  const handleSubmitNewUrl = (index) => {
    setLinks(
      links.map((link, i) =>
        i === index ? { ...link, isEditable: false } : link
      )
    );
  };

  // Debounced delete function - 500ms delay
  const debouncedDelete = useCallback(
    debounce(async (urlsToDelete) => {
      try {
        const urlsArray = Array.from(urlsToDelete);
        console.log("Sending delete request for URLs:", urlsArray);
        const res = await deleteSourceUrls(sourceId, urlsArray);
        console.log("Delete response:", res);

        if (res.error) {
          console.error("Delete error:", res.error);
          toast({ title: res.error, variant: "destructive" });
          // Remove from deleting state on error
          setDeletingUrls((prev) => {
            const newSet = new Set(prev);
            urlsArray.forEach((url) => newSet.delete(url));
            return newSet;
          });
          return;
        }

        // Remove from both lists on success
        setLinks((prevLinks) => {
          const newLinks = prevLinks.filter(
            (link) => !urlsArray.includes(link.url)
          );
          console.log("Updated links:", newLinks);
          return newLinks;
        });

        setDeletingUrls((prev) => {
          const newSet = new Set(prev);
          urlsArray.forEach((url) => newSet.delete(url));
          return newSet;
        });

        setPendingDeletes(new Set());

        toast({
          title: `${urlsArray.length} URL(s) deleted successfully`,
          variant: "success",
        });
      } catch (error) {
        console.error("Unexpected error during deletion:", error);
        toast({
          title: "An unexpected error occurred",
          description: error.message,
          variant: "destructive",
        });
        // Remove from deleting state on error
        setDeletingUrls((prev) => {
          const newSet = new Set(prev);
          urlsArray.forEach((url) => newSet.delete(url));
          return newSet;
        });
        setPendingDeletes(new Set());
      }
    }, 500),
    [sourceId, deleteSourceUrls, toast]
  );

  const handleDeleteUrl = useCallback(
    (url) => {
      // Add to both deleting state for UI feedback and pendingDeletes for batch processing
      setDeletingUrls((prev) => new Set([...prev, url]));
      setPendingDeletes((prev) => {
        const newSet = new Set(prev);
        newSet.add(url);
        debouncedDelete(newSet);
        return newSet;
      });
    },
    [debouncedDelete]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedDelete.cancel();
    };
  }, [debouncedDelete]);

  if (isLoading) {
    return (
      <div className="w-full">
        <h2 className="text-sm font-medium mb-1">Crawl Website</h2>
        <div className="flex items-center gap-2">
          <Skeleton className="flex-grow h-10" />
          <Skeleton className="h-10 w-[138px]" />
        </div>
        <p className="text-muted-foreground text-xs mt-2 mb-4">
          This will crawl all the links starting with the URL (not including
          files on the website).
        </p>
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <LinkSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-sm font-medium mb-1">Crawl Website</h2>
      <div className="flex items-center gap-2">
        <Input
          placeholder="https://www.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-grow text-sm"
        />
        <Button
          onClick={handleFetchMoreLinks}
          className="bg-primary text-primary-foreground text-sm px-1 font-medium min-w-[138px]"
        >
          Fetch links
        </Button>
      </div>
      <p className="text-muted-foreground text-xs mt-2 mb-4">
        This will crawl all the links starting with the URL (not including files
        on the website).
      </p>

      {links.length > 0 && (
        <>
          <h3 className="text-sm text-foreground font-medium mt-4 mb-1">
            Included links
          </h3>
          <p className="text-muted-foreground text-xs mb-4">
            Add links to your website, blog, or social media profiles.
          </p>

          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handleRecrawlExisting}
              className="h-9 px-3 text-[14px] font-medium leading-6 flex items-center justify-center"
            >
              Recrawl existing pages
            </Button>
            <Button
              variant="outline"
              onClick={handleCrawlMore}
              className="h-9 px-3 text-[14px] font-medium leading-6 flex items-center justify-center"
            >
              Crawl next 10 pages
            </Button>
            <div className="flex-grow" />
          </div>
        </>
      )}

      <ul className="space-y-2">
        {isRecrawling ? (
          // Show skeletons for all existing links when recrawling
          links.map((_, index) => <LinkSkeleton key={index} />)
        ) : (
          <>
            {links.map((link, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-lg space-x-2"
              >
                <Badge
                  variant="success"
                  className="rounded-full min-w-[67px] text-center"
                >
                  {(link.size / 1024).toFixed(1)}KB
                </Badge>
                <Input
                  className="flex-grow border border-input text-foreground truncate disabled:opacity-100 disabled:cursor-auto"
                  value={link.url}
                  disabled={true}
                />
                <button
                  onClick={() => handleDeleteUrl(link.url)}
                  disabled={deletingUrls.has(link.url)}
                  className={`min-h-7 min-w-7 rounded-md flex justify-center items-center ${
                    deletingUrls.has(link.url)
                      ? "bg-muted text-muted-foreground"
                      : "text-red-500 bg-destructive/[.1] hover:text-red-700"
                  }`}
                >
                  {deletingUrls.has(link.url) ? (
                    <LuLoader2 className="animate-spin" />
                  ) : (
                    <LuTrash2 />
                  )}
                </button>
              </li>
            ))}
            {isCrawling && <LinkSkeleton />}
          </>
        )}
      </ul>
    </div>
  );
};

export default Page;
