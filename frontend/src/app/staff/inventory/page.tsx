"use client";

import { useState, useEffect } from "react";
import { StaffLayout } from "@/components/layout/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { inventoryService } from "@/services/inventoryService";
import { authService } from "@/services/authService";
import type { Inventory, StockAdjustmentRequest } from "@/types/inventory";
import { Search, Package, AlertTriangle, TrendingDown, RefreshCw, ArrowUpDown, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StaffInventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterStatus, setFilterStatus] = useState<"all" | "instock" | "lowstock" | "outofstock">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { user } = await authService.checkAuth();
        if (user) {
          setUserId(user.userId);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getInventory();
      console.log("Fetched inventory data:", data);
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to load inventory. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStockAdjustment = (item: Inventory) => {
    setSelectedInventory(item);
    setIsModalOpen(true);
  };

  const handleSubmitStockAdjustment = async (request: StockAdjustmentRequest) => {
    try {
      await inventoryService.createStockAdjustment(request);
      toast({
        variant: "success",
        title: "Success",
        description: "Stock adjustment request submitted successfully.",
      });
      fetchInventory();
    } catch (error) {
      console.error("Error submitting stock adjustment:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to submit stock adjustment request. Please try again.",
      });
      throw error;
    }
  };

  const filteredInventory = (inventory || []).filter(
    (item) => {
      const matchesSearch = item.product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.brand.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Apply status filter
      if (filterStatus !== "all") {
        const availableStock = item.currentStock - item.reservedStock;
        if (filterStatus === "outofstock" && availableStock > 0) return false;
        if (filterStatus === "lowstock" && (availableStock <= 0 || availableStock >= 10)) return false;
        if (filterStatus === "instock" && availableStock < 10) return false;
      }
      
      return matchesSearch;
    }
  );

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
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, sortedInventory.length);
  const paginatedInventory = sortedInventory.slice(startIndex, endIndex);

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

  const stats = {
    totalProducts: inventory.length,
    lowStock: inventory.filter((item) => {
      const available = item.currentStock - item.reservedStock;
      return available > 0 && available < 10;
    }).length,
    outOfStock: inventory.filter((item) => (item.currentStock - item.reservedStock) <= 0).length,
    totalValue: inventory.reduce((sum, item) => sum + (item.originalPrice * item.currentStock), 0),
  };

  const getStockStatus = (item: Inventory) => {
    const available = item.currentStock - item.reservedStock;
    if (available <= 0) {
      return { label: "Out of Stock", color: "bg-red-100 text-red-700 border border-red-200" };
    } else if (available < 10 && available > 0) {
      return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700 border border-yellow-200" };
    } else if (available < 50) {
      return { label: "Medium Stock", color: "bg-blue-100 text-blue-700 border border-blue-200" };
    } else {
      return { label: "In Stock", color: "bg-green-100 text-green-700 border border-green-200" };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <StaffLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
            <p className="text-slate-600 mt-1">Monitor stock levels and submit adjustment requests</p>
          </div>
          <Button
            onClick={fetchInventory}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Products</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalProducts}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Low Stock</p>
                <p className="text-2xl font-bold text-slate-900">{stats.lowStock}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Out of Stock</p>
                <p className="text-2xl font-bold text-slate-900">{stats.outOfStock}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Controls Bar */}
        <Card className="p-4 mb-6 bg-white border-slate-200">
          <div className="flex items-center justify-between gap-4">
            {/* Search - Left Side */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by product name or brand..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 bg-white border-slate-300 text-slate-900 focus:border-green-500"
              />
            </div>

            {/* Sort and Filter Controls - Right Side */}
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
              {(sortBy !== "name" || sortOrder !== "asc" || filterStatus !== "all" || searchTerm) && (
                <Button
                  onClick={() => {
                    setSortBy("name");
                    setSortOrder("asc");
                    setFilterStatus("all");
                    setSearchTerm("");
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
          </div>
        </Card>

        {/* Inventory Table */}
        <Card className="bg-white border-slate-200">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Reserved
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedInventory.map((item) => {
                    const availableStock = item.currentStock - item.reservedStock;
                    const status = getStockStatus(item);
                    
                    return (
                      <tr key={item.inventoryId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.product.productImages[0] && (
                              <img
                                src={item.product.productImages[0]}
                                alt={item.product.productName}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-slate-900 max-w-xs">
                                {item.product.productName}
                              </div>
                              {item.product.salePercentage > 0 && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                                  {item.product.salePercentage}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">{item.product.brand}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {item.currentStock}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">{item.reservedStock}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-medium ${
                            availableStock < 10 ? "text-red-600" : "text-green-600"
                          }`}>
                            {availableStock}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {formatCurrency(item.originalPrice)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            onClick={() => handleStockAdjustment(item)}
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                          >
                            Stock Adjustment
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {sortedInventory.length === 0 && (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">No inventory found</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {searchTerm || filterStatus !== "all"
                      ? "No products match your filters"
                      : "No products in inventory"}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
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
            </>
          )}
        </Card>

        {/* Stock Adjustment Modal */}
        <StockAdjustmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitStockAdjustment}
          inventory={selectedInventory}
          userId={userId}
        />
      </div>
    </StaffLayout>
  );
}
