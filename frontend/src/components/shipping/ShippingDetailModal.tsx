"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shippingService } from "@/services/shippingService";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import type { ShippingLog } from "@/types/shipping";
import {
  Package,
  X,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  User,
  CheckCircle,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

interface ShippingDetailModalProps {
  shippingLog: ShippingLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  userRole?: string;
  currentUserId?: string;
}

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "PICKED_UP", label: "Picked Up" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "RETURNED", label: "Returned" },
];

// Status progression order (excluding FAILED and RETURNED which can happen anytime)
const statusOrder = [
  "PENDING",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const getAvailableStatuses = (currentStatus: string) => {
  // If already FAILED or RETURNED, only allow those two
  if (currentStatus === "FAILED" || currentStatus === "RETURNED") {
    return statusOptions.filter(
      (opt) => opt.value === "FAILED" || opt.value === "RETURNED"
    );
  }

  // If DELIVERED, can't change anymore (only show DELIVERED)
  if (currentStatus === "DELIVERED") {
    return statusOptions.filter((opt) => opt.value === "DELIVERED");
  }

  const currentIndex = statusOrder.indexOf(currentStatus);

  // Show current status, next statuses in order, plus FAILED and RETURNED
  return statusOptions.filter((opt) => {
    const optIndex = statusOrder.indexOf(opt.value);

    // Always allow FAILED or RETURNED
    if (opt.value === "FAILED" || opt.value === "RETURNED") {
      return true;
    }

    // Allow current status and any status after it in the progression
    return optIndex >= currentIndex;
  });
};

export function ShippingDetailModal({
  shippingLog,
  open,
  onOpenChange,
  onUpdate,
  userRole,
  currentUserId,
}: ShippingDetailModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPictures, setIsUploadingPictures] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignStaff, setShowAssignStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffList, setStaffList] = useState<
    Array<{ userId: string; fullName: string; email: string }>
  >([]);
  const [newStatus, setNewStatus] = useState(shippingLog?.status || "PENDING");
  const [note, setNote] = useState("");
  const [isCodCollected, setIsCodCollected] = useState(
    shippingLog?.isCodCollected || false
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open && userRole === "admin") {
      fetchStaffList();
    }
  }, [open, userRole]);

  const fetchStaffList = async () => {
    try {
      const response = await userService.getUsers(1, 100);
      const staff = response.users.filter((user: any) => user.role === "staff");
      setStaffList(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  if (!shippingLog) return null;

  const handleAssignStaff = async () => {
    if (!selectedStaffId) {
      toast({
        title: "Error",
        description: "Please select a staff member",
        variant: "error",
      });
      return;
    }

    try {
      setIsAssigning(true);
      await shippingService.assignStaff(
        shippingLog.shippingLogId,
        selectedStaffId,
        true // force assignment
      );

      toast({
        title: "Success",
        description: "Staff assigned successfully",
      });

      setShowAssignStaff(false);
      setSelectedStaffId("");
      onUpdate();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to assign staff",
        variant: "error",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignToMe = async () => {
    try {
      setIsAssigning(true);

      // Get current user info
      const currentUser = await authService.checkAuth();

      // Assign the delivery to me
      await shippingService.assignToMe(shippingLog.shippingLogId);

      // If carrier name is empty or not set, update it with staff's name
      if (
        (!shippingLog.carrierName || shippingLog.carrierName.trim() === "") &&
        currentUser?.user?.fullName
      ) {
        try {
          await shippingService.updateShippingLog(shippingLog.shippingLogId, {
            carrierName: currentUser.user.fullName,
          });
        } catch (updateError) {
          console.error("Failed to auto-set carrier name:", updateError);
          // Don't fail the whole operation if carrier update fails
        }
      }

      toast({
        title: "Success",
        description: "You have successfully claimed this delivery",
      });

      onUpdate();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to claim delivery",
        variant: "error",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (
      newStatus === shippingLog.status &&
      !note &&
      isCodCollected === shippingLog.isCodCollected
    ) {
      toast({
        title: "No changes",
        description: "Please make some changes before updating",
        variant: "error",
      });
      return;
    }

    try {
      setIsLoading(true);

      await shippingService.updateShippingLog(shippingLog.shippingLogId, {
        status: newStatus !== shippingLog.status ? newStatus : undefined,
        note: note || undefined,
        isCodCollected:
          isCodCollected !== shippingLog.isCodCollected
            ? isCodCollected
            : undefined,
        codCollectDate:
          isCodCollected && !shippingLog.isCodCollected
            ? new Date().toISOString()
            : undefined,
      });

      toast({
        title: "Success",
        description: "Shipping log updated successfully",
      });

      onUpdate();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to update shipping log",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 5) {
        toast({
          title: "Too many files",
          description: "You can only upload up to 5 images",
          variant: "error",
        });
        return;
      }
      setSelectedFiles(files);
    }
  };

  const handleUploadPictures = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image",
        variant: "error",
      });
      return;
    }

    try {
      setIsUploadingPictures(true);

      await shippingService.uploadFinishedPictures(
        shippingLog.shippingLogId,
        selectedFiles
      );

      toast({
        title: "Success",
        description: "Delivery proof uploaded successfully",
      });

      setSelectedFiles([]);
      onUpdate();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to upload pictures",
        variant: "error",
      });
    } finally {
      setIsUploadingPictures(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Shipping Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-600">Shipping ID</Label>
              <p className="font-mono text-sm">{shippingLog.shippingLogId}</p>
            </div>
            <div>
              <Label className="text-slate-600">Order ID</Label>
              <p className="font-mono text-sm">{shippingLog.orderId}</p>
            </div>
          </div>

          {/* Customer & Address */}
          {shippingLog.order && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-600">Name</Label>
                  <p>{shippingLog.order.customer?.user?.fullName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Phone</Label>
                  <p>{shippingLog.order.customer?.user?.phone || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-slate-600">Shipping Address</Label>
                  <p>{shippingLog.order.shippingAddress || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Shipping Information */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Truck className="h-4 w-4" />
              Shipping Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-slate-600">Carrier</Label>
                <p>{shippingLog.carrierName || "N/A"}</p>
              </div>
              <div>
                <Label className="text-slate-600">Shipping Fee</Label>
                <p>{formatCurrency(shippingLog.shippingFee)}</p>
              </div>
              <div>
                <Label className="text-slate-600">Estimated Delivery</Label>
                <p>{formatDate(shippingLog.estimatedDeliveryDate)}</p>
              </div>
              <div>
                <Label className="text-slate-600">Delivered Date</Label>
                <p>{formatDate(shippingLog.deliveredDate)}</p>
              </div>
              {shippingLog.shippingStaff && (
                <div className="col-span-2">
                  <Label className="text-slate-600">Assigned Staff</Label>
                  <p>
                    {shippingLog.shippingStaff.fullName} (
                    {shippingLog.shippingStaff.email})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Section */}
          {!shippingLog.shippingStaffId && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-green-900">
                <User className="h-4 w-4" />
                Assignment Required
              </h3>

              {!showAssignStaff ? (
                <>
                  <p className="text-sm text-green-800 mb-3">
                    This delivery is not yet assigned to any staff member.
                  </p>
                  <div className="flex gap-2">
                    {userRole !== "admin" && (
                      <Button
                        onClick={handleAssignToMe}
                        disabled={isAssigning}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <User className="h-4 w-4 mr-2" />
                        {isAssigning ? "Assigning..." : "Claim This Delivery"}
                      </Button>
                    )}
                    {userRole === "admin" && (
                      <Button
                        onClick={() => setShowAssignStaff(true)}
                        variant="outline"
                        className="border-green-600 text-green-700 hover:bg-green-100"
                      >
                        Assign to Staff
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="staffSelect">Select Staff Member</Label>
                    <select
                      id="staffSelect"
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value="">Choose a staff member...</option>
                      {staffList.map((staff) => (
                        <option key={staff.userId} value={staff.userId}>
                          {staff.fullName || staff.email} - {staff.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAssignStaff}
                      disabled={isAssigning || !selectedStaffId}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isAssigning ? "Assigning..." : "Assign"}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAssignStaff(false);
                        setSelectedStaffId("");
                      }}
                      variant="outline"
                      disabled={isAssigning}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COD Information */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <DollarSign className="h-4 w-4" />
              COD Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-slate-600">Total Amount</Label>
                <p className="font-semibold">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(parseFloat(shippingLog.totalAmount))}
                </p>
              </div>
              <div>
                <Label className="text-slate-600">COD Collected</Label>
                <p>
                  {shippingLog.isCodCollected ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Yes - {formatDate(shippingLog.codCollectDate)}
                    </span>
                  ) : (
                    <span className="text-slate-500">Not collected</span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <Label className="text-slate-600">COD Transferred</Label>
                <p>
                  {shippingLog.isCodTransferred ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Yes - {formatDate(shippingLog.codTransferDate)}
                    </span>
                  ) : (
                    <span className="text-slate-500">Not transferred</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Update Status Section */}
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Update Shipping Status
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as ShippingLog["status"])
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {getAvailableStatuses(shippingLog.status).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note about this update..."
                  rows={3}
                />
              </div>

              {!shippingLog.isCodCollected && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="codCollected"
                    checked={isCodCollected}
                    onChange={(e) => setIsCodCollected(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <Label htmlFor="codCollected" className="cursor-pointer">
                    Mark COD as collected
                  </Label>
                </div>
              )}

              <Button onClick={handleUpdateStatus} disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>

          {/* Upload Delivery Proof */}
          {shippingLog.status === "DELIVERED" && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Upload className="h-4 w-4" />
                Delivery Proof
              </h3>

              {shippingLog.finishedPictures &&
                shippingLog.finishedPictures.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-slate-600 mb-2 block">
                      Existing Photos
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {shippingLog.finishedPictures.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Delivery proof ${index + 1}`}
                          className="h-32 w-full rounded object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pictures">Upload Photos (Max 5)</Label>
                  <Input
                    id="pictures"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {selectedFiles.length > 0 && (
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleUploadPictures}
                  disabled={isUploadingPictures || selectedFiles.length === 0}
                  variant="outline"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {isUploadingPictures ? "Uploading..." : "Upload Pictures"}
                </Button>
              </div>
            </div>
          )}

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
