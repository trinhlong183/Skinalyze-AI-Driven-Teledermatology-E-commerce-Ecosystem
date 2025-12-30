"use client";

import { useTreatment } from "@/contexts/TreatmentContext";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X, ShoppingBasket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PendingCart() {
  const { pendingProducts, removeFromPending } = useTreatment();

  if (pendingProducts.length === 0) return null;

  return (
    <div className="border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 animate-in slide-in-from-bottom-5 duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-50/50 border-b border-blue-100">
        <div className="flex items-center gap-2">
          <ShoppingBasket className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-900">
            Selected Items
          </span>
          <Badge className="h-5 px-1.5 bg-blue-600 text-[10px]">
            {pendingProducts.length}
          </Badge>
        </div>
      </div>

      {/* Horizontal List of Items */}
      <div className="p-3">
        <ScrollArea className="w-full whitespace-nowrap pb-3">
          <div className="flex w-max space-x-2">
            {pendingProducts.map((product) => (
              <div
                key={product.productId}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1 py-1"
              >
                <span className="text-xs font-medium text-slate-700 max-w-[120px] truncate">
                  {product.productName}
                </span>
                <button
                  onClick={() => removeFromPending(product.productId!)}
                  className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
