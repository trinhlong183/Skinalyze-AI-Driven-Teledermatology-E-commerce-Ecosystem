"use client";

import React, { useState, useEffect } from "react";
import { useTreatment } from "@/contexts/TreatmentContext";
import { useEngineSignal } from "@/contexts/EngineSignalContext";
import type { RoutineDetail, RoutineProductItem } from "@/types/routine-detail";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

import { SessionProductRow } from "./SessionProductRow";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  PlusCircle,
  Loader2,
  Undo2,
  PackagePlus,
} from "lucide-react";

// --- DnD Imports ---
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface RoutineDetailEditorProps {
  detail: RoutineDetail;
  isNew?: boolean; // True nếu đang tạo mới (Temp)
  onCancelNew?: () => void; // Hàm hủy khi đang tạo mới
}

export function RoutineDetailEditor({
  detail,
  isNew = false,
  onCancelNew,
}: RoutineDetailEditorProps) {
  // 1. Hooks Context
  const {
    updateRoutineDetail,
    addRoutineDetail,
    deleteRoutineDetail,
    cacheProducts,
  } = useTreatment();

  const { lastDrop } = useEngineSignal();

  // 2. Local State
  const [isOpen, setIsOpen] = useState(isNew);
  const [draft, setDraft] = useState<RoutineDetail>(detail);
  const [isDirty, setIsDirty] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    description?: string;
    content?: string;
    products?: string;
  }>({});

  // 3. Effects

  // Sync props -> state
  useEffect(() => {
    if (!isNew) {
      setDraft(detail);
      setIsDirty(false);
    }
  }, [detail, isNew]);

  // Dirty Check
  useEffect(() => {
    if (!isNew) {
      const isChanged = JSON.stringify(draft) !== JSON.stringify(detail);
      setIsDirty(isChanged);
    }
  }, [draft, detail, isNew]);

  // Lắng nghe sự kiện Drop
  useEffect(() => {
    if (lastDrop && lastDrop.targetSessionId === detail.routineDetailId) {
      handleAddProduct(lastDrop.product);
      if (!isOpen) setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDrop]);

  // 4. DnD Droppable Setup
  const { setNodeRef, isOver } = useDroppable({
    id: `session::${detail.routineDetailId}`,
    data: {
      type: "SESSION_CONTAINER",
      detail: detail,
    },
  });

  const safeProducts = draft.products ?? [];

  // --- HANDLERS (Local State Update) ---

  const handleFieldChange = <K extends keyof RoutineDetail>(
    field: K,
    value: RoutineDetail[K]
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (field === "description") {
      setValidationErrors((prev) => ({ ...prev, description: undefined }));
    }
    if (field === "content") {
      setValidationErrors((prev) => ({ ...prev, content: undefined }));
    }
  };

  const handleProductChange = (
    index: number,
    field: keyof RoutineProductItem,
    value: string
  ) => {
    const newProducts = [...safeProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };
    handleFieldChange("products", newProducts);

    if (field === "productName") {
      const hasMissingNames = newProducts.some(
        (product) => product.isExternal && !(product.productName || "").trim()
      );

      if (!hasMissingNames) {
        setValidationErrors((prev) => ({ ...prev, products: undefined }));
      }
    }
  };

  const handleRemoveProduct = (index: number) => {
    const newProducts = [...safeProducts];
    newProducts.splice(index, 1);
    handleFieldChange("products", newProducts);

    const hasMissingNames = newProducts.some(
      (product) => product.isExternal && !(product.productName || "").trim()
    );

    if (!hasMissingNames) {
      setValidationErrors((prev) => ({ ...prev, products: undefined }));
    }
  };

  // Helper Add Product
  const handleAddProduct = (product: Product | null, customName?: string) => {
    const newProduct: RoutineProductItem = {
      routineDetailProductId: crypto.randomUUID(),
      productName: product ? product.productName : customName || "",
      productId: product?.productId || null,
      isExternal: !product,
      usage: "",
      frequency: draft.stepType === "morning" ? "Morning" : "Evening",
      note: "",
      externalLink: "",
    };

    if (product) cacheProducts([product]);

    handleFieldChange("products", [...safeProducts, newProduct]);
  };

  const handleDiscardChanges = () => {
    setDraft(detail);
    setIsDirty(false);
  };

  // --- API ACTIONS ---

  const isOtherMissingTitle =
    draft.stepType === "other" && !(draft.description || "").trim();
  const isContentMissing = !(draft.content || "").trim();

  const handleSave = async () => {
    if (isOtherMissingTitle || isContentMissing) {
      setValidationErrors((prev) => ({
        ...prev,
        ...(isOtherMissingTitle
          ? { description: "Please provide a title for this session." }
          : {}),
        ...(isContentMissing
          ? { content: "Instructions cannot be empty." }
          : {}),
      }));
      return;
    }

    const externalWithMissingName = safeProducts.filter(
      (product) => product.isExternal && !(product.productName || "").trim()
    );

    if (externalWithMissingName.length > 0) {
      setValidationErrors((prev) => ({
        ...prev,
        products: "Please enter a name for each external product.",
      }));
      setIsOpen(true);
      return;
    }

    setValidationErrors({});
    setIsLocalSaving(true);
    try {
      // Map DTO for Backend
      const productsDto = safeProducts.map((p) => ({
        productId: p.productId || undefined,
        productName: p.productName,
        isExternal: p.isExternal,
        usage: p.usage || undefined,
        frequency: p.frequency || undefined,
        note: p.note || undefined,
        externalLink: p.externalLink || undefined,
      }));

      if (isNew) {
        // CREATE
        await addRoutineDetail({
          routineId: draft.routineId,
          stepType: draft.stepType!,
          content: draft.content,
          description: draft.description || undefined,
          products: productsDto,
        });
        if (onCancelNew) onCancelNew();
      } else {
        // UPDATE (FIX TYPE HERE)
        await updateRoutineDetail(draft.routineDetailId, {
          stepType: draft.stepType,
          content: draft.content,
          description: draft.description || undefined,
          products: productsDto,
        });
        setIsDirty(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLocalSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsLocalSaving(true);
    try {
      if (isNew) {
        if (onCancelNew) onCancelNew();
      } else {
        await deleteRoutineDetail(draft.routineDetailId);
      }
    } finally {
      setIsLocalSaving(false);
    }
  };

  // --- RENDER ---
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      ref={setNodeRef}
      className={cn(
        "rounded-xl border transition-all bg-white shadow-sm relative",
        isOver
          ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/30"
          : "border-slate-200",
        !isNew && isDirty && !isOver
          ? "border-amber-400 ring-1 ring-amber-100"
          : ""
      )}
    >
      {/* 1. HEADER */}
      <div className="flex items-center justify-between p-3">
        <CollapsibleTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="flex w-full items-center gap-2 rounded-md p-2 text-center cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            )}

            {/* Title Editable */}
            <div onClick={(e) => e.stopPropagation()} className="flex-1 mr-2 ">
              {draft.stepType === "other" ? (
                <input
                  className="text-sm text-center font-bold bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full placeholder:text-slate-400"
                  placeholder="Session Name..."
                  value={draft.description || ""}
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                  onKeyDown={(event) => event.stopPropagation()}
                  aria-invalid={Boolean(validationErrors.description)}
                />
              ) : (
                <span className="font-bold text-sm capitalize text-slate-800">
                  {draft.stepType} Routine
                </span>
              )}
            </div>

            <Badge
              variant="secondary"
              className="text-[10px] h-5 px-1.5 min-w-[20px] justify-center shrink-0"
            >
              {safeProducts.length}
            </Badge>

            {/* Status Badges */}
            {isDirty && !isNew && (
              <Badge className="text-[10px] h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 ml-2">
                Modified
              </Badge>
            )}
            {isNew && (
              <Badge className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 ml-2">
                New
              </Badge>
            )}
            {draft.stepType === "other" && validationErrors.description && (
              <span className="text-[10px] text-red-500 ml-2">
                {validationErrors.description}
              </span>
            )}
          </div>
        </CollapsibleTrigger>

        {/* DELETE ACTION */}
        {isNew ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancelNew}
            className="h-7 w-7 text-slate-400 hover:text-slate-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the {draft.stepType} routine.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isLocalSaving}
                >
                  {isLocalSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* 2. BODY */}
      <CollapsibleContent>
        <div className="p-3 pt-0 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">
              Instructions
            </Label>
            <Textarea
              placeholder={`Instructions for ${draft.stepType}...`}
              className="min-h-[60px] text-xs resize-none bg-slate-50 focus:bg-white transition-colors"
              value={draft.content}
              onChange={(e) => handleFieldChange("content", e.target.value)}
              aria-invalid={Boolean(validationErrors.content)}
            />
            {validationErrors.content && (
              <span className="text-[10px] text-red-500">
                {validationErrors.content}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-slate-400 font-bold flex justify-between">
              Products
              <span className="font-normal normal-case text-slate-300">
                (Drag to reorder)
              </span>
            </Label>

            {safeProducts.length === 0 && !isOver && (
              <div className="border-2 border-dashed border-slate-100 rounded-lg py-4 text-center">
                <p className="text-xs text-slate-400">No products yet.</p>
                <p className="text-[10px] text-slate-300">
                  Drag from tray or add manually
                </p>
              </div>
            )}

            <SortableContext
              items={safeProducts.map(
                (p) => p.routineDetailProductId || p.productName
              )}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {safeProducts.map((item, index) => (
                  <SessionProductRow
                    key={item.routineDetailProductId || index}
                    item={item}
                    onRemove={() => handleRemoveProduct(index)}
                    onUpdate={(f, v) => handleProductChange(index, f, v)}
                    showExternalNameError={Boolean(
                      validationErrors.products &&
                        item.isExternal &&
                        !(item.productName || "").trim()
                    )}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          {validationErrors.products && (
            <p className="text-[11px] text-red-500">
              {validationErrors.products}
            </p>
          )}

          {/* Add Manual Button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs text-slate-500 border-dashed hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50"
              onClick={() => handleAddProduct(null, "")}
            >
              <PackagePlus className="w-3.5 h-3.5 mr-2" />
              Manually Add Custom Product
            </Button>
          </div>

          {/* 3. SAVE / DISCARD ACTIONS */}
          {(isDirty || isNew) && (
            <div className="pt-3 border-t border-slate-100 flex gap-2 animate-in fade-in slide-in-from-top-1">
              <Button
                type="button"
                className={cn(
                  "flex-1 h-8 text-xs",
                  isNew
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={handleSave}
                disabled={isLocalSaving || isOtherMissingTitle}
              >
                {isLocalSaving ? (
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                ) : isNew ? (
                  <PlusCircle className="w-3 h-3 mr-2" />
                ) : (
                  <Save className="w-3 h-3 mr-2" />
                )}
                {isNew ? "Create Session" : "Update Changes"}
              </Button>

              {!isNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs px-2"
                  onClick={handleDiscardChanges}
                  disabled={isLocalSaving}
                  title="Discard Changes"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
