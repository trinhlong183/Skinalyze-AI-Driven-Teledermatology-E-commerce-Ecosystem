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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WithdrawalRequest, WithdrawalStatus } from "@/types/withdrawal";
import {
  Wallet,
  User,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Building2,
  Hash,
} from "lucide-react";

interface WithdrawalDetailModalProps {
  withdrawal: WithdrawalRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (requestId: string, note?: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onSetProcessing: (requestId: string, note?: string) => void;
}

export default function WithdrawalDetailModal({
  withdrawal,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onSetProcessing,
}: WithdrawalDetailModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [note, setNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!withdrawal) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: WithdrawalStatus) => {
    const statusConfig = {
      [WithdrawalStatus.PENDING]: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-800 dark:text-yellow-300",
        icon: Clock,
      },
      [WithdrawalStatus.VERIFIED]: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-800 dark:text-blue-300",
        icon: CheckCircle,
      },
      [WithdrawalStatus.APPROVED]: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-800 dark:text-purple-300",
        icon: CheckCircle,
      },
      [WithdrawalStatus.REJECTED]: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-800 dark:text-red-300",
        icon: XCircle,
      },
      [WithdrawalStatus.COMPLETED]: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-800 dark:text-green-300",
        icon: CheckCircle,
      },
      [WithdrawalStatus.CANCELLED]: {
        bg: "bg-slate-100 dark:bg-slate-900/30",
        text: "text-slate-800 dark:text-slate-300",
        icon: XCircle,
      },
    };

    const config = statusConfig[status];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="h-4 w-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(withdrawal.requestId, note || undefined);
      setNote("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setIsProcessing(true);
    try {
      await onReject(withdrawal.requestId, rejectionReason);
      setRejectionReason("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetProcessing = async () => {
    setIsProcessing(true);
    try {
      await onSetProcessing(withdrawal.requestId, note || undefined);
      setNote("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Wallet className="h-6 w-6 text-blue-600" />
            Withdrawal Request Details
          </DialogTitle>
          <DialogDescription>
            Review and process the withdrawal request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status and Amount */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-500 mb-1">Status</p>
              {getStatusBadge(withdrawal.status)}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 mb-1">Amount</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(withdrawal.amount)}
              </p>
            </div>
          </div>

          {/* Request Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              Request Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Request ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                  {withdrawal.requestId.slice(0, 12)}...
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Type</p>
                <p className="text-slate-900 dark:text-slate-100 capitalize">
                  {withdrawal.type}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Created At</p>
                <p className="text-slate-900 dark:text-slate-100">
                  {formatDate(withdrawal.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-slate-600" />
              Customer Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Full Name</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {withdrawal.fullName}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">User ID</p>
                <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                  {withdrawal.userId.slice(0, 12)}...
                </p>
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              Bank Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Bank Name</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {withdrawal.bankName}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-1">Account Number</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {withdrawal.accountNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {withdrawal.notes && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                Customer Notes
              </h3>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700">
                  {withdrawal.notes}
                </p>
              </div>
            </div>
          )}

          {/* Processing Information */}
          {(withdrawal.processedBy ||
            withdrawal.processedAt ||
            withdrawal.rejectionReason) && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-600" />
                Processing Information
              </h3>
              <div className="space-y-2">
                {withdrawal.processedBy && (
                  <div>
                    <p className="text-sm text-slate-500">Processed By</p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {withdrawal.processedBy}
                    </p>
                  </div>
                )}
                {withdrawal.processedAt && (
                  <div>
                    <p className="text-sm text-slate-500">Processed At</p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {formatDate(withdrawal.processedAt)}
                    </p>
                  </div>
                )}
                {withdrawal.rejectionReason && (
                  <div>
                    <p className="text-sm text-slate-500">Rejection Reason</p>
                    <p className="text-red-600 dark:text-red-400">
                      {withdrawal.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions for pending/verified status */}
          {(withdrawal.status === WithdrawalStatus.PENDING ||
            withdrawal.status === WithdrawalStatus.VERIFIED) && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label htmlFor="rejectionReason">
                  Rejection Reason (Required if rejecting)
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {withdrawal.status === WithdrawalStatus.PENDING && (
            <>
              <Button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleSetProcessing}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </>
          )}

          {withdrawal.status === WithdrawalStatus.VERIFIED && (
            <>
              <Button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}

          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
