"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Inventory, StockAdjustmentRequest } from "@/types/inventory";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: StockAdjustmentRequest) => Promise<void>;
  inventory: Inventory | null;
  userId: string;
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  onSubmit,
  inventory,
  userId,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setadjustmentType] = useState<"INCREASE" | "DECREASE">(
    "INCREASE"
  );
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [originalPrice, setoriginalPrice] = useState<number | undefined>(
    undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (inventory && isOpen) {
      // Reset form when modal opens
      setadjustmentType("INCREASE");
      setQuantity(0);
      setReason("");
      setoriginalPrice(
        parseFloat(inventory.originalPrice.toString()) || undefined
      );
    }
  }, [inventory, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inventory || quantity <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const request: StockAdjustmentRequest = {
        productId: inventory.productId,
        adjustmentType,
        quantity,
        reason: reason || undefined,
        requestedBy: userId,
      };

      // Only include originalPrice if It&apos;s different from current and not undefined
      if (
        originalPrice !== undefined &&
        originalPrice !== parseFloat(inventory.originalPrice.toString())
      ) {
        request.originalPrice = originalPrice;
      }

      await onSubmit(request);

      // Reset form
      setadjustmentType("INCREASE");
      setQuantity(0);
      setReason("");
      setoriginalPrice(undefined);
      onClose();
    } catch (error) {
      console.error("Error submitting stock adjustment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setadjustmentType("INCREASE");
    setQuantity(0);
    setReason("");
    setoriginalPrice(undefined);
    onClose();
  };

  if (!inventory) return null;

  const availableStock = inventory.currentStock - inventory.reservedStock;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Stock Adjustment Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Info */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start gap-4">
              {inventory.product.productImages[0] && (
                <img
                  src={inventory.product.productImages[0]}
                  alt={inventory.product.productName}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {inventory.product.productName}
                </h3>
                <p className="text-sm text-slate-600">
                  {inventory.product.brand}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Current Stock:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      {inventory.currentStock}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reserved:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      {inventory.reservedStock}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Available:</span>
                    <span
                      className={`ml-1 font-medium ${
                        availableStock < 10 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {availableStock}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Original Price:</span>
                    <span className="ml-1 font-medium text-slate-900">
                      $
                      {parseFloat(inventory.originalPrice.toString()).toFixed(
                        2
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentType" className="text-slate-700">
              Adjustment Type *
            </Label>
            <select
              id="adjustmentType"
              value={adjustmentType}
              onChange={(e) =>
                setadjustmentType(e.target.value as "INCREASE" | "DECREASE")
              }
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none"
            >
              <option value="INCREASE">Increase Stock</option>
              <option value="DECREASE">Decrease Stock</option>
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-700">
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity || ""}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
              placeholder={`Enter quantity to ${adjustmentType.toLowerCase()}`}
              className="bg-white border-slate-300 text-slate-900"
            />
            <p className="text-xs text-slate-500">Minimum: 1 unit</p>
          </div>

          {/* New Original Price (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="newPrice" className="text-slate-700">
              New Original Price (Optional)
            </Label>
            <Input
              id="newPrice"
              type="number"
              step="0.01"
              min="0"
              value={originalPrice !== undefined ? originalPrice : ""}
              onChange={(e) =>
                setoriginalPrice(
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              placeholder="Enter new price if changed"
              className="bg-white border-slate-300 text-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty to keep current price (₫
              {parseFloat(inventory.originalPrice.toString()).toFixed(2)})
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-700">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for this adjustment..."
              rows={3}
              className="bg-white border-slate-300 text-slate-900 resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              e.g., &quot;adjustment from supplier - new price
              ₫12,000/unit&quot;, &quot;Damaged items&quot;, &quot;Inventory
              correction&quot;
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || quantity <= 0}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
