"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product, CreateProductRequest, Category } from "@/types/product";
import { X, Plus, Upload, Link as LinkIcon, Star } from "lucide-react";
import { categoryService } from "@/services/categoryService";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductRequest) => Promise<void>;
  onSubmitWithFiles?: (
    data: Omit<CreateProductRequest, "productImages">,
    files: File[],
    existingUrls?: string[]
  ) => Promise<void>;
  product?: Product | null;
  mode: "create" | "edit";
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  onSubmitWithFiles,
  product,
  mode,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<CreateProductRequest>({
    productName: "",
    productDescription: "",
    stock: 0,
    categoryIds: [],
    brand: "",
    sellingPrice: 0,
    productImages: [],
    ingredients: "",
    suitableFor: [],
    salePercentage: 0,
  });

  const [imageInput, setImageInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageFilePreviews, setImageFilePreviews] = useState<string[]>([]);
  const [imageFileKeys, setImageFileKeys] = useState<string[]>([]); // Add unique keys for each file
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [suitableInput, setSuitableInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (product && mode === "edit") {
      // Handle both categories (from API) and categoryIds (from form)
      const categoryIds = product.categories
        ? product.categories.map((cat) => cat.categoryId)
        : product.categoryIds || [];

      const salePercentage =
        typeof product.salePercentage === "string"
          ? parseFloat(product.salePercentage)
          : product.salePercentage;

      setFormData({
        productName: product.productName,
        productDescription: product.productDescription,
        stock: product.stock,
        categoryIds: categoryIds,
        brand: product.brand,
        sellingPrice: product.sellingPrice,
        productImages: product.productImages,
        ingredients: product.ingredients,
        suitableFor: product.suitableFor,
        salePercentage: salePercentage,
      });
    } else {
      // Reset form for create mode
      setFormData({
        productName: "",
        productDescription: "",
        stock: 0,
        categoryIds: [],
        brand: "",
        sellingPrice: 0,
        productImages: [],
        ingredients: "",
        suitableFor: [],
        salePercentage: 0,
      });
      setImageFiles([]);
      setImageFilePreviews([]);
      setImageFileKeys([]);
      setImageMode("url");
    }
  }, [product, mode, isOpen]);

  // Cleanup preview URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      imageFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFilePreviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In edit mode with images (existing or new), use FormData submission
      if (mode === "edit" && (formData.productImages.length > 0 || imageFiles.length > 0) && onSubmitWithFiles) {
        const { productImages, ...dataWithoutImages } = formData;
        // Pass existing images (imagesToKeep) and new files
        await onSubmitWithFiles(dataWithoutImages, imageFiles, productImages);
      } 
      // In create mode with new files
      else if (imageFiles.length > 0 && onSubmitWithFiles) {
        const { productImages, ...dataWithoutImages } = formData;
        await onSubmitWithFiles(dataWithoutImages, imageFiles, productImages);
      } 
      // No images or create mode without files - use JSON
      else {
        await onSubmit(formData);
      }
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addImage = () => {
    if (imageInput.trim()) {
      setFormData({
        ...formData,
        productImages: [...formData.productImages, imageInput.trim()],
      });
      setImageInput("");
    }
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      productImages: formData.productImages.filter((_, i) => i !== index),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);

      // Create preview URLs for the new files
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

      // Generate unique keys for each new file
      const newKeys = newFiles.map(() =>
        Math.random().toString(36).substr(2, 9)
      );

      setImageFiles([...imageFiles, ...newFiles]);
      setImageFilePreviews([...imageFilePreviews, ...newPreviews]);
      setImageFileKeys([...imageFileKeys, ...newKeys]);
    }
  };

  const removeFile = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(imageFilePreviews[index]);

    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImageFilePreviews(imageFilePreviews.filter((_, i) => i !== index));
    setImageFileKeys(imageFileKeys.filter((_, i) => i !== index));
  };

  const setAsPrimaryImage = (index: number) => {
    if (index === 0) return; // Already primary among files

    // Move selected image to the front
    const newFiles = [...imageFiles];
    const newPreviews = [...imageFilePreviews];
    const newKeys = [...imageFileKeys];

    const [selectedFile] = newFiles.splice(index, 1);
    const [selectedPreview] = newPreviews.splice(index, 1);
    const [selectedKey] = newKeys.splice(index, 1);

    newFiles.unshift(selectedFile);
    newPreviews.unshift(selectedPreview);
    newKeys.unshift(selectedKey);

    setImageFiles(newFiles);
    setImageFilePreviews(newPreviews);
    setImageFileKeys(newKeys);
  };

  const setExistingAsPrimary = (index: number) => {
    if (index === 0) return; // Already primary among existing images

    // Move selected existing image to the front
    const newUrls = [...formData.productImages];
    const [selectedUrl] = newUrls.splice(index, 1);
    newUrls.unshift(selectedUrl);

    setFormData({
      ...formData,
      productImages: newUrls,
    });
  };

  // Drag and drop handlers for existing images
  const handleExistingDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('existingImageIndex', index.toString());
    setDraggedIndex(index);
  };

  const handleExistingDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleExistingDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('existingImageIndex'));
    
    if (dragIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newUrls = [...formData.productImages];
    const [draggedUrl] = newUrls.splice(dragIndex, 1);
    newUrls.splice(dropIndex, 0, draggedUrl);

    setFormData({
      ...formData,
      productImages: newUrls,
    });
    setDraggedIndex(null);
  };

  const handleExistingDragEnd = () => {
    setDraggedIndex(null);
  };

  // Drag and drop handlers for new file uploads
  const handleFileDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('fileIndex', index.toString());
    setDraggedIndex(index);
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleFileDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('fileIndex'));
    
    if (dragIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newFiles = [...imageFiles];
    const newPreviews = [...imageFilePreviews];
    const newKeys = [...imageFileKeys];

    // Remove from drag position
    const [draggedFile] = newFiles.splice(dragIndex, 1);
    const [draggedPreview] = newPreviews.splice(dragIndex, 1);
    const [draggedKey] = newKeys.splice(dragIndex, 1);

    // Insert at drop position
    newFiles.splice(dropIndex, 0, draggedFile);
    newPreviews.splice(dropIndex, 0, draggedPreview);
    newKeys.splice(dropIndex, 0, draggedKey);

    setImageFiles(newFiles);
    setImageFilePreviews(newPreviews);
    setImageFileKeys(newKeys);
    setDraggedIndex(null);
  };

  const handleFileDragEnd = () => {
    setDraggedIndex(null);
  };

  const setUrlAsPrimaryImage = (index: number) => {
    if (index === 0) return; // Already primary

    // Move selected URL to the front
    const newUrls = [...formData.productImages];
    const [selectedUrl] = newUrls.splice(index, 1);
    newUrls.unshift(selectedUrl);

    setFormData({
      ...formData,
      productImages: newUrls,
    });
  };

  const addCategory = () => {
    if (
      categoryInput.trim() &&
      !formData.categoryIds.includes(categoryInput.trim())
    ) {
      setFormData({
        ...formData,
        categoryIds: [...formData.categoryIds, categoryInput.trim()],
      });
      setCategoryInput("");
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (formData.categoryIds.includes(categoryId)) {
      // Remove category
      setFormData({
        ...formData,
        categoryIds: formData.categoryIds.filter((id) => id !== categoryId),
      });
    } else {
      // Add category
      setFormData({
        ...formData,
        categoryIds: [...formData.categoryIds, categoryId],
      });
    }
  };

  const removeCategory = (category: string) => {
    setFormData({
      ...formData,
      categoryIds: formData.categoryIds.filter((c) => c !== category),
    });
  };

  const addSuitable = () => {
    if (
      suitableInput.trim() &&
      !formData.suitableFor.includes(suitableInput.trim())
    ) {
      setFormData({
        ...formData,
        suitableFor: [...formData.suitableFor, suitableInput.trim()],
      });
      setSuitableInput("");
    }
  };

  const removeSuitable = (item: string) => {
    setFormData({
      ...formData,
      suitableFor: formData.suitableFor.filter((s) => s !== item),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {mode === "create" ? "Add New Product" : "Edit Product"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName" className="text-slate-700">
              Product Name *
            </Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) =>
                setFormData({ ...formData, productName: e.target.value })
              }
              required
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brand" className="text-slate-700">
              Brand *
            </Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) =>
                setFormData({ ...formData, brand: e.target.value })
              }
              required
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          {/* Product Description */}
          <div className="space-y-2">
            <Label htmlFor="productDescription" className="text-slate-700">
              Description *
            </Label>
            <Textarea
              id="productDescription"
              value={formData.productDescription}
              onChange={(e) =>
                setFormData({ ...formData, productDescription: e.target.value })
              }
              required
              rows={4}
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <Label htmlFor="ingredients" className="text-slate-700">
              Ingredients *
            </Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) =>
                setFormData({ ...formData, ingredients: e.target.value })
              }
              required
              rows={3}
              className="bg-white border-slate-300 text-slate-900"
              placeholder="Water, L-Ascorbic Acid, Hyaluronic Acid..."
            />
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="text-slate-700">
                Price (₫) *
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sellingPrice: parseFloat(e.target.value) || 0,
                  })
                }
                required
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="text-slate-700">
                Stock *
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stock: parseInt(e.target.value) || 0,
                  })
                }
                required
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePercentage" className="text-slate-700">
                Sale (%)
              </Label>
              <Input
                id="salePercentage"
                type="number"
                min="0"
                max="100"
                value={formData.salePercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salePercentage: parseInt(e.target.value) || 0,
                  })
                }
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>
          </div>

          {/* Product Images */}
          <div className="space-y-3">
            <Label className="text-slate-700">Product Images</Label>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-slate-500">
                  PNG, JPG, GIF up to 10MB
                </span>
              </label>
            </div>

            {/* Image Previews - Show both existing URLs and new files */}
            {(formData.productImages.length > 0 || imageFiles.length > 0) && (
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  Images ({formData.productImages.length + imageFiles.length} total)
                  {formData.productImages.length > 0 && imageFiles.length === 0 && " - Drag to reorder"}
                  {formData.productImages.length === 0 && imageFiles.length > 0 && " - Drag to reorder"}
                  {formData.productImages.length > 0 && imageFiles.length > 0 && " - Drag within each group to reorder"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Existing images from database */}
                  {formData.productImages.map((imgUrl, index) => (
                    <div
                      key={`existing-${index}`}
                      draggable
                      onDragStart={(e) => handleExistingDragStart(e, index)}
                      onDragOver={handleExistingDragOver}
                      onDrop={(e) => handleExistingDrop(e, index)}
                      onDragEnd={handleExistingDragEnd}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-colors cursor-move ${
                        draggedIndex === index 
                          ? 'border-blue-500 opacity-50 scale-95' 
                          : 'border-slate-200 hover:border-blue-500'
                      }`}
                      onClick={() => setExistingAsPrimary(index)}
                    >
                      <img
                        src={imgUrl}
                        alt={`Image ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />

                      {/* Primary Badge */}
                      {index === 0 && imageFiles.length === 0 && (
                        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                          <Star className="h-3 w-3 fill-white" />
                          Primary
                        </div>
                      )}

                      {/* Existing Image Badge */}
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                        Existing
                      </div>

                      {/* Hover overlay with buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExistingAsPrimary(index);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
                          >
                            <Star className="h-3 w-3" />
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({
                              ...formData,
                              productImages: formData.productImages.filter((_, i) => i !== index),
                            });
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Newly uploaded files */}
                  {imageFiles.map((file, index) => (
                    <div
                      key={imageFileKeys[index]}
                      draggable
                      onDragStart={(e) => handleFileDragStart(e, index)}
                      onDragOver={handleFileDragOver}
                      onDrop={(e) => handleFileDrop(e, index)}
                      onDragEnd={handleFileDragEnd}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-colors cursor-move ${
                        draggedIndex === index 
                          ? 'border-green-500 opacity-50 scale-95' 
                          : 'border-slate-200 hover:border-green-500'
                      }`}
                      onClick={() => setAsPrimaryImage(index)}
                    >
                      <img
                        src={imageFilePreviews[index]}
                        alt={file.name}
                        className="w-full h-32 object-cover"
                      />

                      {/* Primary Badge */}
                      {index === 0 && formData.productImages.length === 0 && (
                        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                          <Star className="h-3 w-3 fill-white" />
                          Primary
                        </div>
                      )}
                      
                      {/* New Image Badge */}
                      <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded">
                        New
                      </div>

                      {/* Hover overlay with buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAsPrimaryImage(index);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
                          >
                            <Star className="h-3 w-3" />
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Filename at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <Label className="text-slate-700">Categories</Label>

            {/* Category Selection Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
              {categories.length === 0 ? (
                <p className="text-sm text-slate-500 col-span-2 text-center py-2">
                  Loading categories...
                </p>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.categoryId}
                    type="button"
                    onClick={() => toggleCategory(category.categoryId)}
                    className={`text-left px-3 py-2 rounded-lg border-2 transition-all ${
                      formData.categoryIds.includes(category.categoryId)
                        ? "bg-green-100 border-green-500 text-green-900 font-medium"
                        : "bg-white border-slate-200 text-slate-700 hover:border-green-300"
                    }`}
                  >
                    <div className="font-medium text-sm">
                      {category.categoryName}
                    </div>
                    {category.categoryDescription && (
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {category.categoryDescription}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Selected Categories Display */}
            {formData.categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.categoryIds.map((catId) => {
                  const category = categories.find(
                    (c) => c.categoryId === catId
                  );
                  return (
                    <div
                      key={catId}
                      className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full text-sm text-green-900 border border-green-300"
                    >
                      <span>{category?.categoryName || catId}</span>
                      <button
                        type="button"
                        onClick={() => toggleCategory(catId)}
                        className="text-green-700 hover:text-green-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Suitable For */}
          <div className="space-y-2">
            <Label className="text-slate-700">Suitable For</Label>
            <div className="flex gap-2">
              <Input
                value={suitableInput}
                onChange={(e) => setSuitableInput(e.target.value)}
                placeholder="e.g., dry-skin, all-skin-types"
                className="bg-white border-slate-300 text-slate-900"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSuitable();
                  }
                }}
              />
              <Button
                type="button"
                onClick={addSuitable}
                size="icon"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.suitableFor.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm text-slate-700 border border-slate-200"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeSuitable(item)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                ? "Create Product"
                : "Update Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
