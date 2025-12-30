"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ApprovalModal from "@/components/inventory/ApprovalModal";
import DirectAdjustmentModal from "@/components/inventory/DirectAdjustmentModal";
import { ProductDetailModal } from "@/components/inventory/ProductDetailModal";
import { inventoryService } from "@/services/inventoryService";
import { authService } from "@/services/authService";
import { Inventory, PendingAdjustment, AdjustmentApprovalRequest, DirectStockAdjustment } from "@/types/inventory";
import {
  Search,
  Package,
  DollarSign,
  AlertTriangle,
  Archive,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ArrowUpDown,
  Filter,
} from "lucide-react";

export default function AdminInventoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inventory" | "requests">("inventory");
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<PendingAdjustment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price" | "status">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterStatus, setFilterStatus] = useState<"all" | "instock" | "lowstock" | "outofstock">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>("");
  
  // Modals
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [selectedAdjustment, setSelectedAdjustment] = useState<PendingAdjustment | null>(null);
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const response = await authService.checkAuth();
      
      if (!response || !response.user) {
        router.push("/admin/login");
        return;
      }

      if (response.user.role !== "admin") {
        router.push("/");
        return;
      }

      setAdminId(response.user.userId);
      await Promise.all([fetchInventory(), fetchPendingAdjustments()]);
    } catch (error) {
      console.error("Authentication error:", error);
      router.push("/admin/login");
    }
  };

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const data = await inventoryService.getInventory();
      setInventory(data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingAdjustments = async () => {
    try {
      const data = await inventoryService.getPendingAdjustments();
      setPendingAdjustments(data);
    } catch (error) {
      console.error("Failed to fetch pending adjustments:", error);
    }
  };

  const handleDirectAdjustment = async (adjustment: DirectStockAdjustment) => {
    try {
      await inventoryService.adjustStockDirect(adjustment);
      await fetchInventory();
      setShowDirectModal(false);
      setSelectedInventory(null);
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to adjust stock");
    }
  };

  const handleApprove = async (adjustmentId: string, reviewedBy: string, rejectionReason?: string) => {
    try {
      const request: AdjustmentApprovalRequest = {
        adjustmentId,
        status: "APPROVED",
        reviewedBy,
        rejectionReason,
      };
      await inventoryService.reviewAdjustment(request);
      await Promise.all([fetchInventory(), fetchPendingAdjustments()]);
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to approve adjustment");
    }
  };

  const handleReject = async (adjustmentId: string, reviewedBy: string, rejectionReason?: string) => {
    try {
      const request: AdjustmentApprovalRequest = {
        adjustmentId,
        status: "REJECTED",
        reviewedBy,
        rejectionReason,
      };
      await inventoryService.reviewAdjustment(request);
      await fetchPendingAdjustments();
    } catch (error: unknown) {
      throw new Error((error instanceof Error ? error.message : String(error)) || "Failed to reject adjustment");
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const productName = item.product.productName.toLowerCase();
    const brand = item.product.brand.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = productName.includes(query) || brand.includes(query);
    
    // Apply status filter
    if (filterStatus !== "all") {
      const availableStock = item.currentStock - item.reservedStock;
      if (filterStatus === "outofstock" && availableStock > 0) return false;
      if (filterStatus === "lowstock" && (availableStock <= 0 || availableStock >= 10)) return false;
      if (filterStatus === "instock" && availableStock < 10) return false;
    }
    
    return matchesSearch;
  });

  // Sort inventory
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "name":
        comparison = a.product.productName.localeCompare(b.product.productName);
        break;
      case "stock":
        const availableA = a.currentStock - a.reservedStock;
        const availableB = b.currentStock - b.reservedStock;
        comparison = availableA - availableB;
        break;
      case "price":
        comparison = a.originalPrice - b.originalPrice;
        break;
      case "status":
        const statusA = getStockStatus(a.currentStock, a.reservedStock).label;
        const statusB = getStockStatus(b.currentStock, b.reservedStock).label;
        comparison = statusA.localeCompare(statusB);
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const filteredAdjustments = pendingAdjustments.filter((adj) => {
    if (!adj.product) return false;
    const productName = adj.product.productName.toLowerCase();
    const brand = adj.product.brand.toLowerCase();
    const requesterName = adj.requestedByUser?.fullName.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return productName.includes(query) || brand.includes(query) || requesterName.includes(query);
  });

  // Pagination calculations
  const currentData = activeTab === "inventory" ? sortedInventory : filteredAdjustments;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, currentData.length);
  const currentItems = currentData.slice(startIndex, endIndex);
  const currentInventory = activeTab === "inventory" ? currentItems as Inventory[] : [];
  const currentAdjustments = activeTab === "requests" ? currentItems as PendingAdjustment[] : [];

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(page.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage <= 3) {
        for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
          pages.push(i);
        }
        pages.push('...');
      } else if (currentPage >= totalPages - 2) {
        pages.push('...');
        for (let i = Math.max(2, totalPages - 3); i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  // Stats calculations
  const totalProducts = inventory.length;
  const totalValue = inventory.reduce(
    (sum, item) => sum + item.originalPrice * item.currentStock,
    0
  );
  const lowStockCount = inventory.filter((item) => {
    const availableStock = item.currentStock - item.reservedStock;
    return availableStock > 0 && availableStock < 10;
  }).length;
  const outOfStockCount = inventory.filter((item) => {
    const availableStock = item.currentStock - item.reservedStock;
    return availableStock <= 0;
  }).length;
  const pendingCount = pendingAdjustments.length;

  const getStockStatus = (currentStock: number, reservedStock: number) => {
    const availableStock = currentStock - reservedStock;
    if (availableStock <= 0) {
      return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
    } else if (availableStock < 10) {
      return { label: "Low Stock", color: "text-yellow-600 bg-yellow-50" };
    } else if (availableStock < 50) {
      return { label: "Medium", color: "text-blue-600 bg-blue-50" };
    } else {
      return { label: "In Stock", color: "text-green-600 bg-green-50" };
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-600 mt-1">
            Manage product stock levels and review adjustment requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Products</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalProducts}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₫{(totalValue / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{lowStockCount}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockCount}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-red-400 to-red-500 rounded-lg">
                <Archive className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Requests</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{pendingCount}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-400 to-purple-500 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveTab("inventory");
              setCurrentPage(1);
            }}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === "inventory"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Current Inventory
          </button>
          <button
            onClick={() => {
              setActiveTab("requests");
              setCurrentPage(1);
            }}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === "requests"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending Requests
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-6 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Search and Controls Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          {/* Search - Left Side */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder={
                activeTab === "inventory"
                  ? "Search products by name or brand..."
                  : "Search by product or requester..."
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
            />
          </div>

          {/* Sort and Filter Controls - Right Side - Only for Inventory Tab */}
          {activeTab === "inventory" && (
            <div className="flex items-center gap-3">
              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="name">Name</option>
                  <option value="stock">Stock</option>
                  <option value="price">Price</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-3 py-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 transition-colors"
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Filter:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as typeof filterStatus);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All</option>
                  <option value="instock">In Stock</option>
                  <option value="lowstock">Low Stock</option>
                  <option value="outofstock">Out of Stock</option>
                </select>
              </div>

              {/* Reset Button */}
              {(sortBy !== "name" || sortOrder !== "asc" || filterStatus !== "all" || searchQuery) && (
                <Button
                  onClick={() => {
                    setSortBy("name");
                    setSortOrder("asc");
                    setFilterStatus("all");
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === "inventory" ? (
          <Card className="overflow-hidden bg-white border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Product
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Current Stock
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Reserved
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Available
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Price
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Loading inventory...
                      </td>
                    </tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        {searchQuery || filterStatus !== "all" 
                          ? "No products match your filters" 
                          : "No products found"}
                      </td>
                    </tr>
                  ) : (
                    currentInventory.map((item) => {
                      const availableStock = item.currentStock - item.reservedStock;
                      const status = getStockStatus(item.currentStock, item.reservedStock);
                      return (
                        <tr key={item.inventoryId} className="hover:bg-slate-50">
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-medium text-slate-900">
                                {item.product.productName}
                              </p>
                              <p className="text-sm text-slate-500">{item.product.brand}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-900">{item.currentStock}</td>
                          <td className="py-4 px-6 text-slate-900">{item.reservedStock}</td>
                          <td className="py-4 px-6 font-semibold text-slate-900">
                            {availableStock}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-900">
                            ₫{item.originalPrice.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setSelectedInventory(item);
                                  setShowDetailModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                onClick={() => {
                                  setSelectedInventory(item);
                                  setShowDirectModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Adjust
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && activeTab === "inventory" && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {endIndex} of {sortedInventory.length} products
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="border-slate-300"
                  >
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          onClick={() => handlePageChange(page as number)}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={currentPage === page ? "bg-green-500 hover:bg-green-600" : "border-slate-300"}
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="border-slate-300"
                  >
                    Next
                  </Button>
                  <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-slate-600">Go to:</span>
                    <input
                      type="text"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      className="w-16 h-8 text-center border border-slate-300 rounded"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="border-slate-300"
                    >
                      Go
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </Card>
        ) : activeTab === "requests" ? (
          <Card className="overflow-hidden bg-white border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Product
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Type
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Quantity
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Requested By
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Date
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No pending requests
                      </td>
                    </tr>
                  ) : (
                    currentAdjustments.map((adjustment) => (
                      <tr key={adjustment.adjustmentId} className="hover:bg-slate-50">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-slate-900">
                              {adjustment.product?.productName || "Unknown"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {adjustment.product?.brand || ""}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              adjustment.adjustmentType === "INCREASE"
                                ? "text-green-600 bg-green-50"
                                : "text-red-600 bg-red-50"
                            }`}
                          >
                            {adjustment.adjustmentType}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {adjustment.adjustmentType === "INCREASE" ? "+" : "-"}
                          {adjustment.quantity}
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-slate-900">
                              {adjustment.requestedByUser?.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {adjustment.requestedByUser?.email || ""}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600">
                          {new Date(adjustment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            onClick={() => {
                              setSelectedAdjustment(adjustment);
                              setShowApprovalModal(true);
                            }}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && activeTab === "requests" && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {endIndex} of {filteredAdjustments.length} requests
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="border-slate-300"
                  >
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {getPageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          onClick={() => handlePageChange(page as number)}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={currentPage === page ? "bg-green-500 hover:bg-green-600" : "border-slate-300"}
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="border-slate-300"
                  >
                    Next
                  </Button>
                  <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-slate-600">Go to:</span>
                    <input
                      type="text"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      className="w-16 h-8 text-center border border-slate-300 rounded"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="border-slate-300"
                    >
                      Go
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </Card>
        ) : null}
      </div>

      {/* Modals */}
      <DirectAdjustmentModal
        isOpen={showDirectModal}
        onClose={() => {
          setShowDirectModal(false);
          setSelectedInventory(null);
        }}
        inventory={selectedInventory}
        onSubmit={handleDirectAdjustment}
      />

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedAdjustment(null);
        }}
        adjustment={selectedAdjustment}
        onApprove={handleApprove}
        onReject={handleReject}
        reviewerId={adminId}
      />

      <ProductDetailModal
        inventory={selectedInventory}
        open={showDetailModal}
        onOpenChange={(open) => {
          setShowDetailModal(open);
          if (!open) setSelectedInventory(null);
        }}
      />
    </AdminLayout>
  );
}
