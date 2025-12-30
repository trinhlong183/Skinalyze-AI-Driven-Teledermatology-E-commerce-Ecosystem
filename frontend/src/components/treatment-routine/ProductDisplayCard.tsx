"use client";

import { ExternalLink, Package, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { RoutineProductItem } from "@/types/routine-detail";
import type { Product } from "@/types/product";

interface ProductDisplayCardProps {
  routineProduct: RoutineProductItem;
  inventoryProduct?: Product | null; // Dữ liệu lấy từ Context Cache
}

export function ProductDisplayCard({
  routineProduct,
  inventoryProduct,
}: ProductDisplayCardProps) {
  const isExternal = routineProduct.isExternal;
  const displayName =
    routineProduct.productName?.trim() ||
    (isExternal ? "Custom product" : "Unnamed product");

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      {/* --- HEADER: Image & Title --- */}
      <div className="flex gap-4">
        {/* Product Image / Placeholder */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-400">
          {inventoryProduct?.productImages?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inventoryProduct.productImages[0]}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className="h-8 w-8 opacity-50" />
          )}
        </div>

        {/* Title & Brand */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-900 leading-tight line-clamp-2">
                {displayName}
              </h4>

              {/* Brand / Source Info */}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {inventoryProduct?.brand && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {inventoryProduct.brand}
                  </span>
                )}
                {isExternal && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-200 bg-amber-50"
                  >
                    External
                  </Badge>
                )}
                {inventoryProduct?.stock !== undefined &&
                  inventoryProduct.stock <= 5 && (
                    <span className="text-[10px] text-red-600 font-medium flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Low Stock ({inventoryProduct.stock})
                    </span>
                  )}
              </div>
            </div>

            {/* Info Tooltip (Optional metadata) */}
            {inventoryProduct && (
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    <p>Stock: {inventoryProduct.stock}</p>
                    <p>
                      Categories:{" "}
                      {inventoryProduct.categories
                        ?.map((c) => c.categoryName)
                        .join(", ")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* --- BODY: Dosage & Instructions --- */}
      <div className="grid grid-cols-2 gap-3 text-sm mt-1">
        {/* Usage */}
        <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Dosage / Amount
          </span>
          <span className="font-medium text-slate-700">
            {routineProduct.usage || "As directed"}
          </span>
        </div>

        {/* Frequency */}
        <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
            Frequency
          </span>
          <span className="font-medium text-slate-700">
            {routineProduct.frequency || "Daily"}
          </span>
        </div>
      </div>

      {/* --- FOOTER: Note & Link --- */}
      {(routineProduct.note || routineProduct.externalLink) && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Note */}
          <p className="text-xs text-slate-500 italic flex-1 truncate">
            {routineProduct.note ? `Note: ${routineProduct.note}` : ""}
          </p>

          {/* External Link Button */}
          {routineProduct.externalLink && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-blue-600 hover:no-underline hover:text-blue-700"
              asChild
            >
              <a
                href={routineProduct.externalLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buy <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
