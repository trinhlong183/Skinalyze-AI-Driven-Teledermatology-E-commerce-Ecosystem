"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PendingAdjustment } from "@/types/inventory";
import { Package, User, Calendar, ArrowUp, ArrowDown } from "lucide-react";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: PendingAdjustment | null;
  onApprove: (adjustmentId: string, reviewedBy: string, rejectionReason?: string) => Promise<void>;
  onReject: (adjustmentId: string, reviewedBy: string, rejectionReason?: string) => Promise<void>;
  reviewerId: string;
}

export default function ApprovalModal({
  isOpen,
  onClose,
  adjustment,
  onApprove,
  onReject,
  reviewerId,
}: ApprovalModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    if (!adjustment) return;

    setIsLoading(true);
    try {
      await onApprove(adjustment.adjustmentId, reviewerId, rejectionReason);
      setRejectionReason("");
      onClose();
    } catch (error) {
      console.error("Failed to approve adjustment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!adjustment) return;

    setIsLoading(true);
    try {
      await onReject(adjustment.adjustmentId, reviewerId, rejectionReason);
      setRejectionReason("");
      onClose();
    } catch (error) {
      console.error("Failed to reject adjustment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!adjustment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Stock Adjustment Request</DialogTitle>
          <DialogDescription>
            Review the adjustment request from {adjustment.requestedByUser?.fullName || "Unknown"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Information */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {adjustment.product?.productName || "Unknown Product"}
                </h3>
                <p className="text-sm text-slate-600">{adjustment.product?.brand || ""}</p>
              </div>
            </div>

            {adjustment.product && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">Selling Price</p>
                <p className="text-lg font-semibold text-slate-900">
                  ₫{adjustment.product.sellingPrice.toLocaleString('vi-VN')}
                </p>
              </div>
            )}
          </div>

          {/* Adjustment Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  adjustment.adjustmentType === "INCREASE"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                {adjustment.adjustmentType === "INCREASE" ? (
                  <ArrowUp className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Adjustment Type</p>
                <p className="font-semibold text-slate-900">
                  {adjustment.adjustmentType === "INCREASE" ? "Increase Stock" : "Decrease Stock"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500">Quantity</p>
              <p className="text-lg font-semibold text-slate-900">
                {adjustment.adjustmentType === "INCREASE" ? "+" : "-"}
                {adjustment.quantity}
              </p>
            </div>

            {adjustment.reason && (
              <div>
                <p className="text-sm text-slate-500">Reason</p>
                <p className="text-slate-900">{adjustment.reason}</p>
              </div>
            )}

            {adjustment.originalPrice && (
              <div>
                <p className="text-sm text-slate-500">Original Price</p>
                <p className="text-slate-900">
                  ₫{adjustment.originalPrice.toLocaleString('vi-VN')}
                </p>
              </div>
            )}
          </div>

          {/* Requester Information */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <User className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm text-slate-500">Requested by</p>
              <p className="font-medium text-slate-900">
                {adjustment.requestedByUser?.fullName || "Unknown"}
              </p>
              {adjustment.requestedByUser?.email && (
                <p className="text-xs text-slate-500">{adjustment.requestedByUser.email}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Date</p>
              <p className="text-sm text-slate-900">
                {new Date(adjustment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Review Notes */}
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason (Optional for approval, recommended for rejection)</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Add any notes about your decision..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleReject}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Reject"}
          </Button>
          <Button
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            onClick={handleApprove}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
