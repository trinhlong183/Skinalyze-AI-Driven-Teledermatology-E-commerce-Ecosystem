"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useToast } from "@/hooks/use-toast";

// --- Services ---
import { treatmentRoutineService } from "@/services/treamentRoutineService";
import { routineDetailService } from "@/services/routineDetailService";
import { productService } from "@/services/productService";
import { customerService } from "@/services/customerService";

// --- Types ---
import type {
  TreatmentRoutine,
  TimelineEvent,
  UpdateTreatmentRoutineDto,
} from "@/types/treatment-routine";
import type {
  RoutineDetail,
  CreateRoutineDetailDto,
  UpdateRoutineDetailDto,
} from "@/types/routine-detail";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";

interface TreatmentContextType {
  // --- Data States ---
  customer: Customer | null;
  activeRoutine: TreatmentRoutine | null; // View State (Cái đang hiển thị)
  currentActiveRoutine: TreatmentRoutine | null; // Source of Truth (Routine gốc để CRUD)
  timelineEvents: TimelineEvent[];
  productCache: Record<string, Product>;

  // --- UI States ---
  isLoading: boolean; // Loading toàn trang (Init)
  isUpdating: boolean; // Loading cục bộ (khi bấm Save/Delete từng detail)
  isEditing: boolean; // Trạng thái hiển thị Cột Phải (View vs Edit)

  // --- Actions: Init & View ---
  initializeData: (
    customerId: string,
    initialRoutineId: string
  ) => Promise<void>;
  previewRoutineSnapshot: (snapshot: TreatmentRoutine) => void;
  resetToCurrent: () => void;

  // --- Actions: UI Toggle ---
  startEditing: () => void;
  cancelEditing: () => void;

  // --- Actions: DIRECT CRUD (Tác động trực tiếp vào DB) ---
  addRoutineDetail: (dto: CreateRoutineDetailDto) => Promise<void>;
  updateRoutineDetail: (
    detailId: string,
    dto: UpdateRoutineDetailDto
  ) => Promise<void>;
  deleteRoutineDetail: (detailId: string) => Promise<void>;

  // --- Actions: Routine Meta ---
  updateRoutineMeta: (
    updates: Pick<UpdateTreatmentRoutineDto, "routineName" | "status">
  ) => Promise<void>;

  // --- Actions: Cache & Cart ---
  cacheProducts: (products: Product[]) => void;
  pendingProducts: Product[];
  addToPending: (product: Product) => void;
  removeFromPending: (productId: string) => void;
  clearPending: () => void;
  // Create Routine Mode
  initializeCreateMode: (customerId: string) => Promise<void>;
}

const TreatmentContext = createContext<TreatmentContextType | undefined>(
  undefined
);

export function TreatmentProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  // State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<TreatmentRoutine | null>(
    null
  );
  const [currentActiveRoutine, setCurrentActiveRoutine] =
    useState<TreatmentRoutine | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});
  const productCacheRef = useRef<Record<string, Product>>({});

  useEffect(() => {
    productCacheRef.current = productCache;
  }, [productCache]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);

  // --- Helper: Cache Products (Giữ nguyên logic cũ) ---
  const fetchMissingProducts = useCallback(async (details: RoutineDetail[]) => {
    const uniqueIds = new Set<string>();
    const cacheSnapshot = productCacheRef.current;

    details.forEach((detail) => {
      detail.products?.forEach((p) => {
        if (p.productId && !cacheSnapshot[p.productId]) {
          uniqueIds.add(p.productId);
        }
      });
    });

    const idsToFetch = Array.from(uniqueIds);
    if (idsToFetch.length === 0) return;

    try {
      const results = await Promise.all(
        idsToFetch.map((id) => productService.getProduct(id).catch(() => null))
      );
      setProductCache((prev) => {
        const next = { ...prev };
        results.forEach((product) => {
          if (product && product.productId) {
            next[product.productId] = product;
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Product fetch error", err);
    }
  }, []);

  const cacheProducts = useCallback((products: Product[]) => {
    setProductCache((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        if (p.productId) next[p.productId] = p;
      });
      return next;
    });
  }, []);

  // --- Helper: Reload Data (Gọi sau khi CRUD thành công) ---
  // Hàm này cực kỳ quan trọng: Nó tải lại Routine từ Server để lấy ID mới (do Versioning)
  const refreshRoutineData = useCallback(async () => {
    if (!currentActiveRoutine) return;
    try {
      const updatedRoutine = await treatmentRoutineService.getById(
        currentActiveRoutine.routineId
      );
      const freshData = {
        ...updatedRoutine,
        routineDetails: updatedRoutine.routineDetails ?? [],
      };

      // Cập nhật Source of Truth
      setCurrentActiveRoutine(freshData);

      // Nếu đang xem bản Active (không phải xem lịch sử), thì cập nhật luôn View
      if (activeRoutine?.routineId === currentActiveRoutine.routineId) {
        setActiveRoutine(freshData);
      }

      // Cache product mới nếu có
      if (freshData.routineDetails.length) {
        fetchMissingProducts(freshData.routineDetails);
      }
    } catch (err) {
      console.error("Refresh failed", err);
    }
  }, [currentActiveRoutine, activeRoutine, fetchMissingProducts]);

  const initializeCreateMode = useCallback(
    async (customerId: string) => {
      setIsLoading(true);
      // Reset sạch state
      setCustomer(null);
      setActiveRoutine(null);
      setCurrentActiveRoutine(null);
      setTimelineEvents([]); // Tạm thời chưa có timeline của routine này

      try {
        const customerData = await customerService.getCustomer(customerId);
        setCustomer(customerData);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to load patient info",
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const initializeData = useCallback(
    async (customerId: string, initialRoutineId: string) => {
      setIsLoading(true);
      // Reset State
      setCustomer(null);
      setActiveRoutine(null);
      setCurrentActiveRoutine(null);
      setTimelineEvents([]);

      try {
        if (!initialRoutineId) throw new Error("Routine ID missing");

        const [customerData, fullRoutine, timeline] = await Promise.all([
          customerService.getCustomer(customerId),
          treatmentRoutineService.getById(initialRoutineId),
          treatmentRoutineService.getTreatmentTimeline(initialRoutineId),
        ]);

        setCustomer(customerData);

        const routineData = {
          ...fullRoutine,
          routineDetails: fullRoutine.routineDetails ?? [],
        };
        setActiveRoutine(routineData); // View
        setCurrentActiveRoutine(routineData); // Source
        setTimelineEvents(timeline);

        if (routineData.routineDetails.length) {
          fetchMissingProducts(routineData.routineDetails);
        }
      } catch (error) {
        console.error("Init Error:", error);
        toast({
          title: "Failed to load",
          description: "Initialization error.",
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, fetchMissingProducts]
  );

  const previewRoutineSnapshot = useCallback(
    (snapshot: TreatmentRoutine) => {
      setActiveRoutine(snapshot); // Chỉ đổi View, không đổi Source
      if (snapshot.routineDetails?.length) {
        fetchMissingProducts(snapshot.routineDetails);
      }
    },
    [fetchMissingProducts]
  );

  const resetToCurrent = useCallback(() => {
    if (currentActiveRoutine) {
      setActiveRoutine(currentActiveRoutine);
    }
  }, [currentActiveRoutine]);

  // =========================================================
  // ACTIONS: UI MODE
  // =========================================================
  const startEditing = useCallback(() => setIsEditing(true), []);
  const cancelEditing = useCallback(() => setIsEditing(false), []);

  // =========================================================
  // ACTIONS: DIRECT CRUD (Tương tác API trực tiếp)
  // =========================================================

  const addRoutineDetail = useCallback(
    async (dto: CreateRoutineDetailDto) => {
      setIsUpdating(true);
      try {
        const result = await routineDetailService.create(dto);
        await refreshRoutineData(); // Reload để lấy ID thật
        toast({ title: "Session added", variant: "success" });
      } catch (error) {
        console.error(error);
        toast({ title: `${error}`, variant: "error" });
      } finally {
        setIsUpdating(false);
      }
    },
    [refreshRoutineData, toast]
  );

  const updateRoutineDetail = useCallback(
    async (detailId: string, dto: UpdateRoutineDetailDto) => {
      setIsUpdating(true);
      try {
        await routineDetailService.update(detailId, dto);
        await refreshRoutineData(); // Reload để sync version mới
        toast({
          title: "Saved",
          description: "Changes saved successfully.",
          variant: "success",
        });
      } catch (error) {
        console.error(error);
        toast({ title: "Failed to save", variant: "error" });
      } finally {
        setIsUpdating(false);
      }
    },
    [refreshRoutineData, toast]
  );

  const deleteRoutineDetail = useCallback(
    async (detailId: string) => {
      setIsUpdating(true);
      try {
        await routineDetailService.remove(detailId);
        await refreshRoutineData();
        toast({ title: "Session removed", variant: "success" });
      } catch (error) {
        console.error(error);
        toast({ title: "Failed to remove", variant: "error" });
      } finally {
        setIsUpdating(false);
      }
    },
    [refreshRoutineData, toast]
  );

  const updateRoutineMeta = useCallback(
    async (
      updates: Pick<UpdateTreatmentRoutineDto, "routineName" | "status">
    ) => {
      if (!currentActiveRoutine) {
        throw new Error("No routine selected to update.");
      }

      setIsUpdating(true);
      try {
        await treatmentRoutineService.updateMetadata(
          currentActiveRoutine.routineId,
          updates
        );
        await refreshRoutineData();
        toast({
          title: "Routine updated",
          description: "Routine information saved successfully.",
          variant: "success",
        });
      } catch (error) {
        console.error("Routine metadata update failed", error);
        toast({
          title: "Failed to update routine",
          description: "Please try again.",
          variant: "error",
        });
        throw error instanceof Error
          ? error
          : new Error("Failed to update routine metadata");
      } finally {
        setIsUpdating(false);
      }
    },
    [currentActiveRoutine, refreshRoutineData, toast]
  );

  const addToPending = useCallback((product: Product) => {
    setPendingProducts((prev) => {
      if (prev.some((p) => p.productId === product.productId)) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromPending = useCallback((productId: string) => {
    setPendingProducts((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clearPending = useCallback(() => {
    setPendingProducts([]);
  }, []);

  return (
    <TreatmentContext.Provider
      value={{
        initializeCreateMode,

        // Data
        customer,
        activeRoutine,
        currentActiveRoutine,
        timelineEvents,
        productCache,
        // UI
        isLoading,
        isUpdating,
        isEditing,
        // Init & View
        initializeData,
        previewRoutineSnapshot,
        resetToCurrent,
        // Toggle
        startEditing,
        cancelEditing,
        // Direct CRUD
        addRoutineDetail,
        updateRoutineDetail,
        deleteRoutineDetail,
        updateRoutineMeta,
        // Cache & Cart
        cacheProducts,
        pendingProducts,
        addToPending,
        removeFromPending,
        clearPending,
      }}
    >
      {children}
    </TreatmentContext.Provider>
  );
}

export const useTreatment = () => {
  const context = useContext(TreatmentContext);
  if (!context)
    throw new Error("useTreatment must be used within TreatmentProvider");
  return context;
};
