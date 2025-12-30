"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { returnRequestService } from "@/services/returnRequestService";
import { useToast } from "@/hooks/use-toast";
import type { ReturnRequest } from "@/types/return-request";
import {
  Package,
  User,
  Calendar,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Truck,
  Archive,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface ReturnRequestDetailModalProps {
  returnRequest: ReturnRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Truck,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: Archive,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    icon: XCircle,
  },
};

const reasonLabels: Record<string, string> = {
  DAMAGED: "Damaged",
  WRONG_ITEM: "Wrong Item",
  DEFECTIVE: "Defective",
  NOT_AS_DESCRIBED: "Not As Described",
  CHANGE_MIND: "Change of Mind",
  OTHER: "Other",
};

export function ReturnRequestDetailModal({
  returnRequest,
  open,
  onOpenChange,
  onUpdate,
}: ReturnRequestDetailModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [completionNote, setCompletionNote] = useState("");

  if (!returnRequest) return null;

  const statusInfo = statusConfig[returnRequest.status];
  const StatusIcon = statusInfo?.icon || AlertCircle;

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      await returnRequestService.approveReturnRequest(
        returnRequest.returnRequestId,
        {
          reviewNote: reviewNote || undefined,
        }
      );

      toast({
        title: "Success",
        description: "Return request approved successfully",
      });

      onUpdate();
      onOpenChange(false);
      setReviewNote("");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to approve return request",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsLoading(true);
      await returnRequestService.rejectReturnRequest(
        returnRequest.returnRequestId,
        {
          reviewNote: reviewNote || undefined,
        }
      );

      toast({
        title: "Success",
        description: "Return request rejected",
      });

      onUpdate();
      onOpenChange(false);
      setReviewNote("");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to reject return request",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignSelf = async () => {
    try {
      setIsLoading(true);
      await returnRequestService.assignSelfToReturnRequest(
        returnRequest.returnRequestId
      );

      toast({
        title: "Success",
        description: "You have been assigned to this return request",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to assign return request",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!completionNote) {
      toast({
        title: "Missing Information",
        description: "Please add a completion note",
        variant: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      await returnRequestService.completeReturnRequest(
        returnRequest.returnRequestId,
        {
          completionNote,
        }
      );

      toast({
        title: "Success",
        description: "Return request completed successfully",
      });

      onUpdate();
      onOpenChange(false);
      setCompletionNote("");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete return request",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-blue-600" />
            Return Request Details
          </DialogTitle>
          <DialogDescription>
            Order #{returnRequest.orderId.substring(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`${statusInfo.color} px-4 py-2 flex items-center gap-2 text-sm`}
            >
              <StatusIcon className="h-4 w-4" />
              {statusInfo.label}
            </Badge>
          </div>

          {/* Customer Information */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Name</p>
                <p className="font-medium text-slate-900">
                  {returnRequest.customer?.user?.fullName || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Email</p>
                <p className="font-medium text-slate-900">
                  {returnRequest.customer?.user?.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Phone</p>
                <p className="font-medium text-slate-900">
                  {returnRequest.customer?.user?.phone || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Order Total</p>
                <p className="font-medium text-slate-900">
                  {returnRequest.shippingLog?.totalAmount
                    ? `$${parseFloat(
                        returnRequest.shippingLog.totalAmount
                      ).toFixed(2)}`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Return Details */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Return Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Reason</p>
                <p className="font-medium text-slate-900">
                  {reasonLabels[returnRequest.reason] || returnRequest.reason}
                </p>
              </div>
              {returnRequest.reasonDetail && (
                <div>
                  <p className="text-slate-500">Details</p>
                  <p className="font-medium text-slate-900">
                    {returnRequest.reasonDetail}
                  </p>
                </div>
              )}
              <div>
                <p className="text-slate-500">Tracking Number</p>
                <p className="font-medium text-slate-900">
                  {returnRequest.shippingLog?.ghnOrderCode ||
                    returnRequest.shippingLogId.substring(0, 8) + "..."}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Created At</p>
                <p className="font-medium text-slate-900">
                  {new Date(returnRequest.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Photos */}
          {returnRequest.evidencePhotos &&
            returnRequest.evidencePhotos.length > 0 && (
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Evidence Photos
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {returnRequest.evidencePhotos.map((photo, index) => (
                    <a
                      key={index}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group"
                    >
                      <img
                        src={photo}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md border border-slate-200"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

          {/* Review Information */}
          {returnRequest.reviewedAt && (
            <div className="rounded-lg border border-slate-200 p-4 bg-blue-50">
              <h3 className="font-semibold text-slate-900 mb-3">
                Review Information
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-slate-500">Reviewed By</p>
                  <p className="font-medium text-slate-900">
                    {returnRequest.reviewedByStaff?.fullName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Reviewed At</p>
                  <p className="font-medium text-slate-900">
                    {new Date(returnRequest.reviewedAt).toLocaleString()}
                  </p>
                </div>
                {returnRequest.reviewNote && (
                  <div>
                    <p className="text-slate-500">Review Note</p>
                    <p className="font-medium text-slate-900">
                      {returnRequest.reviewNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assigned Staff */}
          {returnRequest.assignedStaff && (
            <div className="rounded-lg border border-slate-200 p-4 bg-purple-50">
              <h3 className="font-semibold text-slate-900 mb-3">
                Assigned Staff
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-slate-500">Staff Name</p>
                  <p className="font-medium text-slate-900">
                    {returnRequest.assignedStaff.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Assigned At</p>
                  <p className="font-medium text-slate-900">
                    {returnRequest.assignedAt
                      ? new Date(returnRequest.assignedAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions based on status */}
          {returnRequest.status === "PENDING" && (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-yellow-50">
              <h3 className="font-semibold text-slate-900">
                Review & Decision
              </h3>
              <div>
                <Label htmlFor="reviewNote">Review Note (Optional)</Label>
                <Textarea
                  id="reviewNote"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note about your decision..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {returnRequest.status === "APPROVED" && (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-blue-50">
              <h3 className="font-semibold text-slate-900">Take Action</h3>
              <p className="text-sm text-slate-600">
                This return request has been approved. Assign yourself to start
                the return process.
              </p>
              <Button
                onClick={handleAssignSelf}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Truck className="h-4 w-4 mr-2" />
                Assign to Me
              </Button>
            </div>
          )}

          {returnRequest.status === "IN_PROGRESS" && (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4 bg-purple-50">
              <h3 className="font-semibold text-slate-900">Complete Return</h3>
              <div>
                <Label htmlFor="completionNote">Completion Note *</Label>
                <Textarea
                  id="completionNote"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Describe the condition of returned items..."
                  rows={3}
                  required
                />
              </div>
              <Button
                onClick={handleComplete}
                disabled={isLoading || !completionNote}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Archive className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
            </div>
          )}

          {returnRequest.status === "COMPLETED" &&
            returnRequest.completionNote && (
              <div className="rounded-lg border border-slate-200 p-4 bg-green-50">
                <h3 className="font-semibold text-slate-900 mb-3">
                  Completion Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-500">Completed At</p>
                    <p className="font-medium text-slate-900">
                      {returnRequest.returnedToWarehouseAt
                        ? new Date(
                            returnRequest.returnedToWarehouseAt
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Completion Note</p>
                    <p className="font-medium text-slate-900">
                      {returnRequest.completionNote}
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
