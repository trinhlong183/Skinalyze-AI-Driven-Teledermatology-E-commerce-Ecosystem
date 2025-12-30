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
import { orderService } from "@/services/orderService";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types/order";
import { Package, X, User } from "lucide-react";

interface CreateShippingLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedOrderId?: string;
  userRole?: string;
}

export function CreateShippingLogModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedOrderId,
  userRole,
}: CreateShippingLogModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmedOrders, setConfirmedOrders] = useState<Order[]>([]);
  const [staffList, setStaffList] = useState<
    Array<{ userId: string; fullName: string; email: string }>
  >([]);
  const [formData, setFormData] = useState({
    orderId: "",
    carrierName: "",
    shippingFee: "",
    estimatedDeliveryDate: "",
    note: "",
    assignedStaffId: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchConfirmedOrders();
      if (userRole === "admin") {
        fetchStaffList();
      }
      if (preselectedOrderId) {
        setFormData((prev) => ({ ...prev, orderId: preselectedOrderId }));
      }
    }
  }, [isOpen, preselectedOrderId, userRole]);

  const fetchConfirmedOrders = async () => {
    try {
      const response = await orderService.getOrders();
      const confirmed = response.data.filter(
        (order: Order) => order.status === "CONFIRMED"
      );
      setConfirmedOrders(confirmed);
    } catch (error) {
      console.error("Error fetching confirmed orders:", error);
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await userService.getUsers(1, 100);
      const staff = response.users.filter((user: any) => user.role === "staff");
      setStaffList(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderId) {
      toast({
        title: "Error",
        description: "Please select an order",
        variant: "error",
      });
      return;
    }

    if (!formData.shippingFee || parseFloat(formData.shippingFee) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid shipping fee",
        variant: "error",
      });
      return;
    }

    try {
      setIsLoading(true);

      const createPayload = {
        orderId: formData.orderId,
        carrierName: formData.carrierName || undefined,
        shippingFee: parseFloat(formData.shippingFee),
        estimatedDeliveryDate: formData.estimatedDeliveryDate || undefined,
        note: formData.note || undefined,
      };

      console.log("Creating shipping log with payload:", createPayload);

      const newShippingLog = await shippingService.createShippingLog(
        createPayload
      );

      // If admin assigned a staff member, assign them now
      if (formData.assignedStaffId && userRole === "admin") {
        try {
          await shippingService.assignStaff(
            newShippingLog.shippingLogId,
            formData.assignedStaffId,
            true
          );
        } catch (assignError) {
          console.error("Failed to assign staff:", assignError);
          // Still show success for shipping log creation
        }
      }

      toast({
        title: "Success",
        description: formData.assignedStaffId
          ? "Shipping log created and staff assigned successfully"
          : "Shipping log created successfully",
      });

      onSuccess();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to create shipping log",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Create Shipping Log
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Selection - only show if no preselected order */}
          {!preselectedOrderId && (
            <div className="space-y-2">
              <Label htmlFor="orderId">
                Order <span className="text-red-500">*</span>
              </Label>
              <select
                id="orderId"
                name="orderId"
                value={formData.orderId}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="">Select an order...</option>
                {confirmedOrders.map((order) => {
                  const totalAmount = order.orderItems.reduce((sum, item) => {
                    return sum + parseFloat(item.priceAtTime) * item.quantity;
                  }, 0);
                  return (
                    <option key={order.orderId} value={order.orderId}>
                      {order.orderId.slice(0, 8)}... -{" "}
                      {order.customer?.user?.fullName ||
                        order.customer?.user?.email ||
                        "Customer"}{" "}
                      -{" "}
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(totalAmount)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Carrier Name */}
          <div className="space-y-2">
            <Label htmlFor="carrierName">Carrier Name (Optional)</Label>
            <Input
              id="carrierName"
              name="carrierName"
              value={formData.carrierName}
              onChange={handleChange}
              placeholder="e.g., Giao Hàng Nhanh, J&T Express"
            />
            <p className="text-xs text-slate-500">
              Can be filled later by staff
            </p>
          </div>

          {/* Shipping Fee */}
          <div className="space-y-2">
            <Label htmlFor="shippingFee">
              Shipping Fee (VND) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="shippingFee"
              name="shippingFee"
              type="number"
              value={formData.shippingFee}
              onChange={handleChange}
              placeholder="30000"
              required
              min="0"
              step="1000"
            />
          </div>

          {/* Estimated Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="estimatedDeliveryDate">
              Estimated Delivery Date
            </Label>
            <Input
              id="estimatedDeliveryDate"
              name="estimatedDeliveryDate"
              type="datetime-local"
              value={formData.estimatedDeliveryDate}
              onChange={handleChange}
            />
          </div>

          {/* Staff Assignment - Admin Only */}
          {userRole === "admin" && (
            <div className="space-y-2">
              <Label
                htmlFor="assignedStaffId"
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4 text-blue-600" />
                Assign to Staff (Optional)
              </Label>
              <select
                id="assignedStaffId"
                name="assignedStaffId"
                value={formData.assignedStaffId}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="">
                  Leave unassigned (staff can claim later)
                </option>
                {staffList.map((staff) => (
                  <option key={staff.userId} value={staff.userId}>
                    {staff.fullName || staff.email} - {staff.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                You can assign now or staff can claim it later
              </p>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="e.g., Giao giờ hành chính"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Shipping Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
