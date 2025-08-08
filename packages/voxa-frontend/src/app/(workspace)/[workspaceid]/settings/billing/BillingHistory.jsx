import BillingHistoryTable from "@/components/settings/BillingHistoryTable";
import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const BillingHistory = () => {
  const { workspaceId, fetchInvoices } = useWorkspace();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    has_more: false,
    next_page_token: null,
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const loadInvoices = useCallback(
    async (startingAfterToken = null) => {
      if (!workspaceId) {
        console.log("loadInvoices: workspaceId not ready, skipping fetch.");
        return;
      }

      console.log(
        `loadInvoices called with startingAfterToken: ${startingAfterToken}`
      );
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchInvoices({
          limit: 10,
          startingAfter: startingAfterToken,
        });

        setInvoices((prevInvoices) =>
          startingAfterToken
            ? [...prevInvoices, ...data.invoices]
            : data.invoices
        );

        setPagination({
          has_more: data.has_more,
          next_page_token: data.next_page_token,
        });
      } catch (err) {
        console.error("Error loading invoices in component:", err);
        setError(err.message || "Failed to load billing history.");
        setInvoices([]);
        setPagination({ has_more: false, next_page_token: null });
      } finally {
        setIsLoading(false);
        if (!initialLoadComplete) setInitialLoadComplete(true);
      }
    },
    [workspaceId, fetchInvoices, initialLoadComplete]
  );

  useEffect(() => {
    if (workspaceId && !initialLoadComplete) {
      loadInvoices();
    }
  }, [workspaceId, loadInvoices, initialLoadComplete]);

  const loadNextPage = () => {
    if (pagination.has_more && pagination.next_page_token && !isLoading) {
      loadInvoices(pagination.next_page_token);
    }
  };

  if (!initialLoadComplete && isLoading) {
    return <Skeleton className="h-60 w-full mt-4" />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <BillingHistoryTable
      invoices={invoices}
      isLoading={isLoading}
      pagination={pagination}
      loadNextPage={loadNextPage}
    />
  );
};

export default BillingHistory;
