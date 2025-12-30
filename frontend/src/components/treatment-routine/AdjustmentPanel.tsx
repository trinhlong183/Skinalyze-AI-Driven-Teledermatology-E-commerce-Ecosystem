"use client";

import { useTreatment } from "@/contexts/TreatmentContext";
import { ProductLibrary } from "./adjustment/product-library/ProductLibrary";
import { AdjustmentEngine } from "./adjustment/engine/AdjustmentEngine";
import { cn } from "@/lib/utils"; // Import cn utility

export function AdjustmentPanel() {
  const { isEditing } = useTreatment();

  return (
    <div className="h-full w-full bg-white flex flex-col border-l border-slate-200 shadow-xl transition-all duration-300 overflow-hidden">
      {/* 1. VIEW MODE: PRODUCT LIBRARY */}
      <div className={cn("h-full w-full", isEditing ? "hidden" : "block")}>
        <ProductLibrary />
      </div>

      {/* 2. EDIT MODE: ADJUSTMENT ENGINE */}
      <div className={cn("h-full w-full", !isEditing ? "hidden" : "block")}>
        <AdjustmentEngine />
      </div>
    </div>
  );
}
