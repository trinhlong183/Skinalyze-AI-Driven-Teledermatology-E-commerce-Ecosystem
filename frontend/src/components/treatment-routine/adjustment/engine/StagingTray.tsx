"use client";

import { useTreatment } from "@/contexts/TreatmentContext";
import { useDraggable } from "@dnd-kit/core";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

// --- Sub-component: Draggable Item ---
function TrayItem({ product }: { product: Product }) {
  const { removeFromPending } = useTreatment();

  // ID đặc biệt để Engine nhận biết đây là item từ Tray
  const dragId = `tray::${product.productId}`;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      type: "TRAY_ITEM",
      product: product, // Gửi kèm data để bên nhận có thể clone
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "relative flex items-center gap-2 rounded-lg border bg-white p-2 pr-8 shadow-sm transition-all cursor-grab active:cursor-grabbing w-[160px] shrink-0",
        isDragging
          ? "opacity-50 ring-2 ring-blue-400 rotate-2"
          : "border-slate-200 hover:border-blue-300"
      )}
    >
      <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
        {/* Icon hoặc ảnh nhỏ */}
        <GripHorizontal className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium truncate text-slate-800"
          title={product.productName}
        >
          {product.productName}
        </p>
        <p className="text-[10px] text-slate-500 truncate">{product.brand}</p>
      </div>

      {/* Nút xóa (cần stopPropagation để không kích hoạt drag khi bấm xóa) */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => removeFromPending(product.productId!)}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-red-500 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// --- Main Component ---
export function StagingTray() {
  const { pendingProducts } = useTreatment();

  if (pendingProducts.length === 0) return null;

  return (
    <div className="bg-slate-50 border-b border-slate-200 p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
          Staging Tray ({pendingProducts.length})
        </span>
        <Badge variant="secondary" className="text-[10px] h-4">
          Drag to Assign ↓
        </Badge>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-3 pb-2">
          {pendingProducts.map((product) => (
            <TrayItem key={product.productId} product={product} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
