"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Inventory, DirectStockAdjustment } from "@/types/inventory";
import { Package } from "lucide-react";

interface DirectAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Inventory | null;
  onSubmit: (adjustment: DirectStockAdjustment) => Promise<void>;
}

export default function DirectAdjustmentModal({
  isOpen,
  onClose,
  inventory,
  onSubmit,
}: DirectAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"INCREASE" | "DECREASE">(
    "INCREASE"
  );
  const [quantity, setQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setAdjustmentType("INCREASE");
      setQuantity("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inventory) return;

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    // Check if trying to decrease more than available
    if (adjustmentType === "DECREASE") {
      const availableStock = inventory.currentStock - inventory.reservedStock;
      if (quantityNum > availableStock) {
        setError(
          `Cannot decrease by ${quantityNum}. Available stock: ${availableStock}`
        );
        return;
      }
    }

    const adjustment: DirectStockAdjustment = {
      productId: inventory.productId,
      quantity: adjustmentType === "INCREASE" ? quantityNum : -quantityNum,
    };

    setIsLoading(true);
    setError("");

    try {
      await onSubmit(adjustment);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to adjust stock");
    } finally {
      setIsLoading(false);
    }
  };

  if (!inventory) return null;

  const availableStock = inventory.currentStock - inventory.reservedStock;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Direct Stock Adjustment</DialogTitle>
          <DialogDescription>
            Make immediate changes to inventory levels (no approval required)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Information */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {inventory.product.productName}
                </h3>
                <p className="text-sm text-slate-600">
                  {inventory.product.brand}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Current</p>
                <p className="text-lg font-semibold text-slate-900">
                  {inventory.currentStock}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Reserved</p>
                <p className="text-lg font-semibold text-slate-900">
                  {inventory.reservedStock}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Available</p>
                <p className="text-lg font-semibold text-green-600">
                  {availableStock}
                </p>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentType">
              Adjustment Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={adjustmentType}
              onValueChange={(value: "INCREASE" | "DECREASE") =>
                setAdjustmentType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCREASE">Increase Stock</SelectItem>
                <SelectItem value="DECREASE">Decrease Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError("");
              }}
              required
            />
            {adjustmentType === "DECREASE" && (
              <p className="text-xs text-slate-500">
                Maximum: {availableStock} (available stock)
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              disabled={isLoading}
            >
              {isLoading ? "Adjusting..." : "Adjust Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
