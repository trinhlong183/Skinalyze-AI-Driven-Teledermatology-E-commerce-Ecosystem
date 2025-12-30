"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { authService } from "@/services/authService";
import { productService } from "@/services/productService";
import type {
  Product,
  CreateProductRequest,
  ProductQueryParams,
} from "@/types/product";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default function AdminProductsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;

  useEffect(() => {
    const checkAuthAndLoadProducts = async () => {
      try {
        // Check authentication
        const { authenticated, user } = await authService.checkAuth();

        if (!authenticated || !user) {
          router.push("/login");
          return;
        }

        if (user.role !== "admin") {
          router.push("/login");
          return;
        }

        // Load products
        await loadProducts();
      } catch {
        router.push("/login");
      }
    };

    checkAuthAndLoadProducts();
  }, [router]);

  const loadProducts = async (page = 1, search = "") => {
    try {
      setIsLoading(true);
      const response = await productService.getProducts({
        page,
        limit: itemsPerPage,
        search: search || undefined,
      });
      setProducts(response.products || []);
      setFilteredProducts(response.products || []);
      setTotalProducts(response.total || 0);
    } catch (error: unknown) {
      console.error("Failed to load products:", error);
      setProducts([]);
      setFilteredProducts([]);
      setTotalProducts(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Load products when page or search changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      loadProducts(currentPage, searchQuery);
    }, searchQuery ? 500 : 0); // Debounce search by 500ms

    return () => clearTimeout(delaySearch);
  }, [currentPage, searchQuery]);

  const handleCreateProduct = () => {
    setModalMode("create");
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setModalMode("edit");
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      await productService.deleteProduct(productId);
      await loadProducts(currentPage, searchQuery);
      toast({
        variant: "success",
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error",
        description: (error instanceof Error ? error.message : String(error)) || "Failed to delete product",
      });
    }
  };

  const handleFormSubmit = async (data: CreateProductRequest) => {
    try {
      if (modalMode === "create") {
        await productService.createProduct(data);
        toast({
          variant: "success",
          title: "Success",
          description: "Product created successfully",
        });
      } else if (selectedProduct?.productId) {
        await productService.updateProduct(selectedProduct.productId, data);
        toast({
          variant: "success",
          title: "Success",
          description: "Product updated successfully",
        });
      }
      await loadProducts();
      setIsModalOpen(false);
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error",
        description: (error instanceof Error ? error.message : String(error)) || "Failed to save product",
      });
    }
  };

  const handleFormSubmitWithFiles = async (
    data: Omit<CreateProductRequest, "productImages">,
    files: File[],
    imagesToKeep?: string[]
  ) => {
    try {
      if (modalMode === "create") {
        await productService.createProductWithFiles(data, files, imagesToKeep);
        toast({
          variant: "success",
          title: "Success",
          description: "Product created successfully with uploaded images",
        });
      } else if (selectedProduct?.productId) {
        await productService.updateProductWithImages(
          selectedProduct.productId,
          data,
          files,
          imagesToKeep
        );
        toast({
          variant: "success",
          title: "Success",
          description: "Product updated successfully",
        });
      }
      await loadProducts(currentPage, searchQuery);
      setIsModalOpen(false);
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: "Error",
        description: (error instanceof Error ? error.message : String(error)) || "Failed to save product",
      });
      throw error;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const calculateStats = () => {
    if (!products || products.length === 0) {
      return { totalValue: 0, totalStock: 0, lowStock: 0, onSale: 0 };
    }

    const totalValue = products.reduce(
      (sum, product) => sum + product.sellingPrice * product.stock,
      0
    );
    const totalStock = products.reduce(
      (sum, product) => sum + product.stock,
      0
    );
    const lowStock = products.filter((product) => product.stock < 10).length;
    const onSale = products.filter((product) => {
      const salePercentage =
        typeof product.salePercentage === "string"
          ? parseFloat(product.salePercentage)
          : product.salePercentage;
      return salePercentage > 0;
    }).length;

    return { totalValue, totalStock, lowStock, onSale };
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-500" />
        </div>
      </AdminLayout>
    );
  }

  const stats = calculateStats();

  // Pagination calculations
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalProducts);

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

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start
        for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
          pages.push(i);
        }
        pages.push('...');
      } else if (currentPage >= totalPages - 2) {
        // Near end
        pages.push('...');
        for (let i = Math.max(2, totalPages - 3); i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Middle
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Products Management
            </h1>
            <p className="text-slate-600 mt-1">
              Manage your product catalog and inventory
            </p>
          </div>
          <Button
            onClick={handleCreateProduct}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {products?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Stock
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats.totalStock}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Inventory Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats.totalValue)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Low Stock
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats.lowStock}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Items below 10 units
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="bg-white border-slate-200 mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <Input
                placeholder="Search products by name, brand, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-slate-300 text-slate-900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Sale
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Categories
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-slate-600"
                      >
                        No products found
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr
                        key={product.productId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.productImages[0] && (
                              <Image
                                src={product.productImages[0]}
                                alt={product.productName}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-10 w-10 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 max-w-xs">
                              <div className="font-medium text-slate-900 truncate">
                                {product.productName}
                              </div>
                              <div className="text-sm text-slate-600 truncate">
                                {product.productDescription}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-700">
                            {product.brand}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrency(product.sellingPrice)}
                          </div>
                          {(typeof product.salePercentage === "string"
                            ? parseFloat(product.salePercentage)
                            : product.salePercentage) > 0 && (
                            <div className="text-xs text-green-600">
                              {product.salePercentage}% off
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              product.stock < 10
                                ? "bg-red-500/20 text-red-400"
                                : product.stock < 50
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {product.stock} units
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(typeof product.salePercentage === "string"
                            ? parseFloat(product.salePercentage)
                            : product.salePercentage) > 0 ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <TrendingUp className="h-3 w-3" />
                              <span className="text-sm">
                                {product.salePercentage}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {(product.categories || product.categoryIds || [])
                              .slice(0, 2)
                              .map((cat) => (
                                <span
                                  key={
                                    typeof cat === "string"
                                      ? cat
                                      : cat.categoryId
                                  }
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-700"
                                >
                                  {typeof cat === "string"
                                    ? cat
                                    : cat.categoryName}
                                </span>
                              ))}
                            {(product.categories?.length ||
                              product.categoryIds?.length ||
                              0) > 2 && (
                              <span className="text-xs text-slate-600">
                                +
                                {(product.categories?.length ||
                                  product.categoryIds?.length ||
                                  0) - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleEditProduct(product)}
                              size="sm"
                              variant="ghost"
                              className="text-black-600 hover:text-black-700 hover:bg-gray-50"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              onClick={() =>
                                product.productId &&
                                handleDeleteProduct(product.productId)
                              }
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {endIndex} of {totalProducts} products
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
                    <Input
                      type="text"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      className="w-16 h-8 text-center border-slate-300"
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
          </CardContent>
        </Card>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        onSubmitWithFiles={handleFormSubmitWithFiles}
        product={selectedProduct}
        mode={modalMode}
      />
    </AdminLayout>
  );
}
