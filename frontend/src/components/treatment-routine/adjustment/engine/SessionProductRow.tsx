"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RoutineProductItem } from "@/types/routine-detail";

interface SessionProductRowProps {
  item: RoutineProductItem;
  onRemove: () => void;
  onUpdate: (field: keyof RoutineProductItem, value: string) => void;
  showExternalNameError?: boolean;
}

export function SessionProductRow({
  item,
  onRemove,
  onUpdate,
  showExternalNameError = false,
}: SessionProductRowProps) {
  // Mặc định mở rộng nếu chưa có liều lượng
  const [isExpanded, setIsExpanded] = useState(!item.usage);

  const trimmedName = (item.productName || "").trim();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.routineDetailProductId || item.productName });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border bg-white transition-all overflow-hidden",
        isDragging
          ? "border-blue-400 shadow-lg"
          : "border-slate-200 hover:border-blue-300",
        isExpanded ? "ring-1 ring-blue-200" : ""
      )}
    >
      {/* --- HEADER --- */}
      <div className="flex items-center gap-2 p-2 bg-white">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-300 hover:text-slate-600 active:cursor-grabbing p-1"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Tên & Toggle Expand */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 mr-2">
            {/* LOGIC EXTERNAL VS INVENTORY */}
            {item.isExternal ? (
              // 1. External Product: Allow Edit Name
              <div
                className="flex-1"
                onClick={(e) => e.stopPropagation()} // Avoid toggle accordion
              >
                <Input
                  className={cn(
                    "h-7 text-sm font-medium px-2 py-1",
                    !trimmedName
                      ? "border-red-300 bg-red-50 focus-visible:ring-red-200"
                      : "border-transparent bg-transparent hover:border-slate-300 focus:bg-white"
                  )}
                  placeholder="Product name (required)"
                  value={item.productName}
                  onChange={(e) => onUpdate("productName", e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()} // Avoid toggle on Enter/Space
                />
                {showExternalNameError && !trimmedName && (
                  <p className="mt-1 text-[10px] text-red-500">
                    Enter a product name for external items.
                  </p>
                )}
              </div>
            ) : (
              // 2. If Inventory: Display Text Only (No Edit)
              <span className="text-sm font-medium text-slate-900 truncate select-none">
                {item.productName}
              </span>
            )}

            {/* Badge External */}
            {item.isExternal && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-200 bg-amber-50 shrink-0"
              >
                External
              </Badge>
            )}
          </div>

          {/* Hiển thị tóm tắt nếu đang thu gọn */}
          {!isExpanded && (item.usage || item.frequency) && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate h-4 pl-1">
              {item.usage ? (
                <span className="text-blue-600 font-medium">{item.usage}</span>
              ) : (
                <span className="italic text-slate-300">No dosage</span>
              )}
              <span>•</span>
              {item.frequency || "Daily"}
            </div>
          )}
        </div>

        {/* Actions Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-300 hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* --- BODY (Input Fields - Expanded) --- */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 grid grid-cols-2 gap-3 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
          {/* 1. Dosage & Frequency */}
          <div className="space-y-1 mt-3">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">
              Dosage
            </Label>
            <Input
              className="h-8 text-xs bg-white"
              placeholder="e.g. 1 pump"
              value={item.usage || ""}
              onChange={(e) => onUpdate("usage", e.target.value)}
            />
          </div>
          <div className="space-y-1 mt-3">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">
              Frequency
            </Label>
            <Input
              className="h-8 text-xs bg-white"
              placeholder="e.g. Daily"
              value={item.frequency || ""}
              onChange={(e) => onUpdate("frequency", e.target.value)}
            />
          </div>

          {/* 2. External Link */}
          {item.isExternal && (
            <div className="col-span-2 space-y-1 relative">
              <Label className="text-[10px] uppercase text-amber-500 font-bold flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Purchase Link
              </Label>
              <Input
                className="h-8 text-xs bg-white border-amber-200 focus-visible:ring-amber-200 pl-2"
                placeholder="https://..."
                value={item.externalLink || ""}
                onChange={(e) => onUpdate("externalLink", e.target.value)}
              />
            </div>
          )}

          {/* 3. Note */}
          <div className="col-span-2 space-y-1">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">
              {"Doctor's Note"}
            </Label>
            <Textarea
              className="h-14 min-h-[56px] text-xs bg-white resize-none"
              placeholder="Special notes..."
              value={item.note || ""}
              onChange={(e) => onUpdate("note", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
