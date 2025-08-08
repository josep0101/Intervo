import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LuTrash2, LuLoader2 } from "react-icons/lu";
import { Progress } from "@/components/ui/progress";
import useFakeProgress from "@/hooks/useFakeProgress";
import { useToast } from "@/hooks/use-toast";
import debounce from "lodash.debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { useSource } from "@/context/SourceContext";

const LinkSkeleton = () => (
  <li className="flex items-center justify-between rounded-lg space-x-2">
    <Skeleton className="h-6 w-[67px] rounded-full" />
    <Skeleton className="flex-grow h-10" />
    <Skeleton className="h-7 w-7 rounded-md" />
  </li>
);

const WebsiteDialogSection = ({ onEdit }) => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isRecrawling, setIsRecrawling] = useState(false);
  const [deletingUrls, setDeletingUrls] = useState(new Set());
  const [links, setLinks] = useState([]);
  const [pendingDeletes, setPendingDeletes] = useState(new Set());

  const {
    startProgress: startFakeProgress,
    stopProgress: stopFakeProgress,
    progressValue: fakeProgressValue,
    isActive: isFakeProgressActive,
    message: fakeProgressMessage,
  } = useFakeProgress();

  const {
    updateSourceWebsites,
    sourceId,
    fetchSourceWebsites,
    deleteSourceUrls,
    recrawlExistingPages,
    crawlMorePages,
  } = useSource();

  console.log(links, "links");

  // Initial loading of website links
  useEffect(() => {
    const fetchUrls = async () => {
      setIsLoading(true);
      if (sourceId) {
        const res = await fetchSourceWebsites(sourceId);
        if (res.error) {
          toast({ title: res.error, variant: "destructive" });
        } else {
          setLinks(res.links || []);
        }
      }
      setIsLoading(false);
    };

    fetchUrls();
  }, [sourceId, fetchSourceWebsites, toast]);

  const handleFetchMoreLinks = async () => {
    if (!url.trim()) {
      toast({ title: "Please enter a valid URL", variant: "destructive" });
      return;
    }

    // Track this edit
    if (onEdit) {
      onEdit({
        type: "website_saving_started",
      });
    }

    setIsCrawling(true);
    startFakeProgress(300000, `Fetching links from ${url.trim()}...`);
    toast({ title: "Website crawling initiated", variant: "success" });

    try {
      const res = await updateSourceWebsites(sourceId, url);
      if (res.error) {
        toast({ title: res.error, variant: "destructive" });

        // Track crawl failure
        if (onEdit) {
          onEdit({
            type: "website_crawl_failed",
            url: url.trim(),
            error: res.error,
          });
        }
      } else {
        setLinks(res.links || []);

        // Track crawl success
        if (onEdit) {
          onEdit({
            type: "website_crawl_complete",
            url: url.trim(),
            linkCount: res.links?.length || 0,
            links: res.links || [],
          });
        }
      }
    } finally {
      setIsCrawling(false);
      stopFakeProgress();
      if (onEdit) {
        onEdit({
          type: "website_saving_completed",
        });
      }
      toast({ title: "Website crawling complete", variant: "success" });
    }
  };

  const handleRecrawlExisting = async () => {
    // Track recrawl start
    if (onEdit) {
      onEdit({
        type: "website_saving_started",
      });
    }

    setIsRecrawling(true);
    startFakeProgress(300000, "Recrawling existing pages..");
    toast({ title: "Recrawling existing pages...", variant: "success" });

    try {
      const res = await recrawlExistingPages(sourceId);
      if (res.error) {
        toast({ title: res.error, variant: "destructive" });

        // Track recrawl failure
        if (onEdit) {
          onEdit({
            type: "website_recrawl_failed",
            error: res.error,
          });
        }
        return;
      }

      setLinks(res.links || []);

      // Track recrawl success
      if (onEdit) {
        onEdit({
          type: "website_recrawl_complete",
          linkCount: res.links?.length || 0,
        });
      }
    } finally {
      setIsRecrawling(false);
      stopFakeProgress();
      if (onEdit) {
        onEdit({
          type: "website_saving_completed",
        });
      }
      toast({ title: "Recrawl complete", variant: "success" });
    }
  };

  const handleCrawlMore = async () => {
    // Track crawl more start
    if (onEdit) {
      onEdit({
        type: "website_saving_started",
      });
    }

    setIsCrawling(true);
    startFakeProgress(300000, "Crawling more pages... (simulated 5 min)");
    toast({ title: "Crawling next set of pages...", variant: "success" });

    try {
      const res = await crawlMorePages(sourceId, 10);
      if (res.error) {
        toast({ title: res.error, variant: "destructive" });

        // Track crawl more failure
        if (onEdit) {
          onEdit({
            type: "website_crawl_more_failed",
            error: res.error,
          });
        }
        return;
      }

      setLinks(res.data?.links || []);

      // Track crawl more success
      if (onEdit) {
        onEdit({
          type: "website_crawl_more_complete",
          linkCount: res.data?.links?.length || 0,
          newLinksCount: (res.data?.links?.length || 0) - links.length,
        });
      }
    } finally {
      setIsCrawling(false);
      stopFakeProgress();
      if (onEdit) {
        onEdit({
          type: "website_saving_completed",
        });
      }
      toast({ title: "Crawl complete", variant: "success" });
    }
  };

  // Debounced delete function - 500ms delay
  const debouncedDelete = useCallback(
    debounce(async (urlsToDelete) => {
      try {
        const urlsArray = Array.from(urlsToDelete);

        // Track deletion start
        if (onEdit) {
          onEdit({
            type: "website_delete_urls_started",
            urlCount: urlsArray.length,
            urls: urlsArray,
          });
        }

        const res = await deleteSourceUrls(sourceId, urlsArray);

        if (res.error) {
          // Track deletion failure
          if (onEdit) {
            onEdit({
              type: "website_delete_urls_failed",
              error: res.error,
              urls: urlsArray,
            });
          }

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
          return newLinks;
        });

        setDeletingUrls((prev) => {
          const newSet = new Set(prev);
          urlsArray.forEach((url) => newSet.delete(url));
          return newSet;
        });

        setPendingDeletes(new Set());

        // Track deletion success
        if (onEdit) {
          onEdit({
            type: "website_delete_urls_complete",
            urlCount: urlsArray.length,
            urls: urlsArray,
          });
        }

        toast({
          title: `${urlsArray.length} URL(s) deleted successfully`,
          variant: "success",
        });
      } catch (error) {
        // Track unexpected error
        if (onEdit) {
          onEdit({
            type: "website_delete_urls_error",
            errorMessage: error.message,
          });
        }

        toast({
          title: "An unexpected error occurred",
          description: error.message,
          variant: "destructive",
        });
        // Remove from deleting state on error
        setDeletingUrls((prev) => {
          const newSet = new Set(prev);
          Array.from(urlsToDelete).forEach((url) => newSet.delete(url));
          return newSet;
        });
        setPendingDeletes(new Set());
      }
    }, 500),
    [sourceId, deleteSourceUrls, toast, onEdit]
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
          disabled={isCrawling}
        >
          {isCrawling ? (
            <>
              <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
              Crawling...
            </>
          ) : (
            "Fetch links"
          )}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs mt-2 mb-4">
        This will crawl all the links starting with the URL (not including files
        on the website).
      </p>

      {/* Fake Progress Display */}
      {isFakeProgressActive && (
        <div className="my-4 p-3 border rounded-md bg-muted/50">
          <p className="text-sm font-medium text-foreground mb-2">
            {fakeProgressMessage}
          </p>
          <Progress value={fakeProgressValue} className="w-full h-2" />
        </div>
      )}

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
              disabled={isRecrawling || links.length === 0}
              className="h-9 px-3 text-[14px] font-medium leading-6 flex items-center justify-center"
            >
              {isRecrawling ? (
                <>
                  <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recrawling...
                </>
              ) : (
                "Recrawl existing pages"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCrawlMore}
              disabled={isCrawling || links.length === 0}
              className="h-9 px-3 text-[14px] font-medium leading-6 flex items-center justify-center"
            >
              {isCrawling ? (
                <>
                  <LuLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Crawling...
                </>
              ) : (
                "Crawl next 10 pages"
              )}
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

export default WebsiteDialogSection;
