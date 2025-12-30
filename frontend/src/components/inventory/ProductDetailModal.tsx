"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inventoryService } from "@/services/inventoryService";
import type { Inventory, AdjustmentHistory } from "@/types/inventory";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface ProductDetailModalProps {
  inventory: Inventory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({
  inventory,
  open,
  onOpenChange,
}: ProductDetailModalProps) {
  const [adjustmentHistory, setAdjustmentHistory] = useState<
    AdjustmentHistory[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && inventory) {
      loadAdjustmentHistory();
    }
  }, [open, inventory]);

  const loadAdjustmentHistory = async () => {
    if (!inventory) return;

    try {
      setIsLoading(true);
      const data = await inventoryService.getProductAdjustmentHistory(
        inventory.productId
      );

      // Filter to show only APPROVED adjustments
      const approvedAdjustments = data.filter(
        (adj: any) => adj.status === "APPROVED"
      );

      setAdjustmentHistory(approvedAdjustments);
    } catch (error) {
      console.error("Failed to load adjustment history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!inventory) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const availableStock = inventory.currentStock - inventory.reservedStock;

  const getStockStatus = () => {
    if (availableStock <= 0) {
      return {
        label: "Out of Stock",
        color: "text-red-600 bg-red-50",
        icon: XCircle,
      };
    } else if (availableStock < 10) {
      return {
        label: "Low Stock",
        color: "text-yellow-600 bg-yellow-50",
        icon: Clock,
      };
    } else {
      return {
        label: "In Stock",
        color: "text-green-600 bg-green-50",
        icon: CheckCircle,
      };
    }
  };

  const status = getStockStatus();
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Product Inventory Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Information */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Product Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-slate-600">Product Name</label>
                <p className="font-medium text-slate-900">
                  {inventory.product.productName}
                </p>
              </div>
              <div>
                <label className="text-slate-600">Brand</label>
                <p className="font-medium text-slate-900">
                  {inventory.product.brand}
                </p>
              </div>
              <div>
                <label className="text-slate-600">Original Price</label>
                <p className="font-medium text-slate-900">
                  ₫{inventory.originalPrice.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-slate-600">Selling Price</label>
                <p className="font-medium text-slate-900">
                  ₫{inventory.product.sellingPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Stock Information */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Stock Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Current Stock</p>
                <p className="text-2xl font-bold text-blue-900">
                  {inventory.currentStock}
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600 mb-1">Reserved</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {inventory.reservedStock}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Available</p>
                <p className="text-2xl font-bold text-green-900">
                  {availableStock}
                </p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Status</p>
                <div className="flex items-center justify-center gap-1">
                  <StatusIcon
                    className={`h-5 w-5 ${status.color.split(" ")[0]}`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      status.color.split(" ")[0]
                    }`}
                  >
                    {status.label}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Adjustment History */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Calendar className="h-4 w-4" />
              Adjustment History (Approved Only)
            </h3>

            {isLoading ? (
              <p className="text-center py-4 text-slate-500">
                Loading history...
              </p>
            ) : adjustmentHistory.length === 0 ? (
              <p className="text-center py-4 text-slate-500">
                No adjustment history available
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {adjustmentHistory.map((adjustment: any) => (
                  <div
                    key={adjustment.adjustmentId}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {adjustment.adjustmentType === "INCREASE" ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <span
                          className={`font-semibold ${
                            adjustment.adjustmentType === "INCREASE"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {adjustment.adjustmentType === "INCREASE" ? "+" : "-"}
                          {adjustment.quantity} units
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                      <div>
                        <span className="text-slate-600">Previous Stock:</span>
                        <span className="ml-2 font-medium text-slate-900">
                          {adjustment.previousStock}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">New Stock:</span>
                        <span className="ml-2 font-medium text-slate-900">
                          {adjustment.newStock}
                        </span>
                      </div>
                    </div>

                    {adjustment.reason && (
                      <div className="text-sm mb-2">
                        <span className="text-slate-600">Reason:</span>
                        <span className="ml-2 text-slate-900">
                          {adjustment.reason}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          Requested by:{" "}
                          {adjustment.requestedByUser?.fullName || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          Reviewed by:{" "}
                          {adjustment.reviewedByUser?.fullName || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created: {formatDate(adjustment.createdAt)}</span>
                      </div>
                      {adjustment.reviewedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Reviewed: {formatDate(adjustment.reviewedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
