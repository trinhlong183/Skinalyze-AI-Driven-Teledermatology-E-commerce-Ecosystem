"use client";

import { useTreatment } from "@/contexts/TreatmentContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, Ban, Package } from "lucide-react";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

interface LibraryProductCardProps {
  product: Product;
}

export function LibraryProductCard({ product }: LibraryProductCardProps) {
  const { pendingProducts, addToPending } = useTreatment();

  // Check if product is already in pendingProducts
  const isAdded = pendingProducts.some(
    (p) => p.productId === product.productId
  );

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border transition-all bg-white",
        isOutOfStock
          ? "opacity-60 bg-slate-50"
          : "hover:border-blue-300 hover:shadow-sm",
        isAdded && "border-blue-200 bg-blue-50/30"
      )}
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center overflow-hidden relative">
        {product.productImages?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.productImages[0]}
            alt={product.productName}
            className={cn(
              "h-full w-full object-cover",
              isOutOfStock && "grayscale"
            )}
          />
        ) : (
          <Package className="h-5 w-5 text-slate-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h4
              className="text-sm font-semibold text-slate-900 line-clamp-1"
              title={product.productName}
            >
              {product.productName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-500 truncate max-w-[100px]">
                {product.brand}
              </p>
              {product.sellingPrice && (
                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 rounded">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(product.sellingPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOutOfStock && (
              <Badge
                variant="destructive"
                className="h-5 px-1.5 text-[10px] font-normal flex gap-1"
              >
                <Ban className="w-3 h-3" /> Out of Stock
              </Badge>
            )}
          </div>

          {/* Action Button */}
          <Button
            size="sm"
            variant={isAdded ? "secondary" : "outline"}
            className={cn(
              "h-7 px-3 text-xs",
              isAdded && "bg-blue-100 text-blue-700 hover:bg-blue-200"
            )}
            onClick={() => !isAdded && !isOutOfStock && addToPending(product)}
            disabled={isAdded || isOutOfStock}
          >
            {isAdded ? (
              <>
                <Check className="w-3 h-3 mr-1" /> Added
              </>
            ) : (
              <>
                <Plus className="w-3 h-3 mr-1" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
