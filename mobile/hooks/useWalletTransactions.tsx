import { useState, useEffect, useCallback } from "react";
import paymentService, {
  WalletTransaction,
  WalletTransactionsResponse,
} from "@/services/paymentService";

interface UseWalletTransactionsOptions {
  page?: number;
  limit?: number;
  status?: "pending" | "completed" | "failed" | "expired" | "refunded";
  autoFetch?: boolean;
}

interface UseWalletTransactionsReturn {
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  currentPage: number;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
  hasMore: boolean;
}

export const useWalletTransactions = (
  options: UseWalletTransactionsOptions = {}
): UseWalletTransactionsReturn => {
  const {
    page: initialPage = 1,
    limit = 10,
    status,
    autoFetch = true,
  } = options;

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const fetchTransactions = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const response: WalletTransactionsResponse =
          await paymentService.getWalletTransactions(pageNum, limit, status);

        if (append) {
          setTransactions((prev) => [...prev, ...response.data]);
        } else {
          setTransactions(response.data);
        }

        setTotal(response.total);
        setTotalPages(response.totalPages);
        setCurrentPage(response.page);
      } catch (err: any) {
        console.error("Error fetching wallet transactions:", err);
        setError(err.message || "Failed to fetch wallet transactions");
      } finally {
        setLoading(false);
      }
    },
    [limit, status]
  );

  const refetch = useCallback(async () => {
    await fetchTransactions(1, false);
  }, [fetchTransactions]);

  const fetchMore = useCallback(async () => {
    if (currentPage < totalPages) {
      await fetchTransactions(currentPage + 1, true);
    }
  }, [currentPage, totalPages, fetchTransactions]);

  useEffect(() => {
    if (autoFetch) {
      fetchTransactions(initialPage, false);
    }
  }, [autoFetch, initialPage, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    total,
    totalPages,
    currentPage,
    refetch,
    fetchMore,
    hasMore: currentPage < totalPages,
  };
};
