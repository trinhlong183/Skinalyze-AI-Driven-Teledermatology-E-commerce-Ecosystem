"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { returnRequestService } from "@/services/returnRequestService";
import { ReturnRequestDetailModal } from "./ReturnRequestDetailModal";
import type {
  ReturnRequest,
  ReturnRequestStatus,
} from "@/types/return-request";
import {
  Package,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Archive,
  AlertCircle,
  Loader2,
} from "lucide-react";

const statusConfig: Record<
  ReturnRequestStatus,
  { label: string; color: string; icon: any }
> = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
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

export function ReturnRequestsList() {
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchReturnRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [returnRequests, searchTerm, statusFilter]);

  const fetchReturnRequests = async () => {
    try {
      setIsLoading(true);
      const response = await returnRequestService.getAllReturnRequests();
      setReturnRequests(response.data);
    } catch (error) {
      console.error("Error fetching return requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = returnRequests;

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (req) =>
          req.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.customer?.user?.fullName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          req.customer?.user?.email
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const handleViewDetails = (request: ReturnRequest) => {
    setSelectedRequest(request);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedRequest(null);
  };

  const handleUpdate = () => {
    fetchReturnRequests();
  };

  const getStatusCounts = () => {
    if (!returnRequests || !Array.isArray(returnRequests)) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        inProgress: 0,
        completed: 0,
      };
    }

    return {
      total: returnRequests.length,
      pending: returnRequests.filter((r) => r.status === "PENDING").length,
      approved: returnRequests.filter((r) => r.status === "APPROVED").length,
      inProgress: returnRequests.filter((r) => r.status === "IN_PROGRESS")
        .length,
      completed: returnRequests.filter((r) => r.status === "COMPLETED").length,
    };
  };

  const counts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {counts.total}
                </p>
              </div>
              <Package className="h-8 w-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {counts.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Approved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {counts.approved}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {counts.inProgress}
                </p>
              </div>
              <Truck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {counts.completed}
                </p>
              </div>
              <Archive className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by order number, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium mb-2">
                No return requests found
              </p>
              <p className="text-sm text-slate-500">
                {searchTerm || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "Return requests will appear here"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const statusInfo = statusConfig[request.status];
            const StatusIcon = statusInfo.icon;

            return (
              <Card
                key={request.returnRequestId}
                className="bg-white border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetails(request)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Order #{request.orderId.substring(0, 8)}...
                          </h3>
                          <p className="text-sm text-slate-600">
                            {request.customer?.user?.fullName ||
                              "Unknown Customer"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Reason</p>
                          <p className="font-medium text-slate-900">
                            {reasonLabels[request.reason] || request.reason}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Created At</p>
                          <p className="font-medium text-slate-900">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Customer</p>
                          <p className="font-medium text-slate-900">
                            {request.customer?.user?.email || "N/A"}
                          </p>
                        </div>
                      </div>

                      {request.reasonDetail && (
                        <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                          {request.reasonDetail}
                        </p>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className={`${statusInfo.color} px-3 py-1 flex items-center gap-1`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>

                      {request.status === "PENDING" && (
                        <Badge
                          variant="outline"
                          className="bg-orange-100 text-orange-800 border-orange-200"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Needs Review
                        </Badge>
                      )}

                      {request.assignedStaff && (
                        <p className="text-xs text-slate-500">
                          Assigned: {request.assignedStaff.fullName}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <ReturnRequestDetailModal
        returnRequest={selectedRequest}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
