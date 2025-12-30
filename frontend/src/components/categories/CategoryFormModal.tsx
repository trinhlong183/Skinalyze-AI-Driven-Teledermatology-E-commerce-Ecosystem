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
import type { Category } from "@/types/product";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<Category, "categoryId" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  category?: Category | null;
  mode: "create" | "edit";
}

export function CategoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  mode,
}: CategoryFormModalProps) {
  const [formData, setFormData] = useState({
    categoryName: "",
    categoryDescription: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category && mode === "edit") {
      setFormData({
        categoryName: category.categoryName,
        categoryDescription: category.categoryDescription,
      });
    } else {
      setFormData({
        categoryName: "",
        categoryDescription: "",
      });
    }
  }, [category, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {mode === "create" ? "Add New Category" : "Edit Category"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="categoryName" className="text-slate-700">
              Category Name *
            </Label>
            <Input
              id="categoryName"
              value={formData.categoryName}
              onChange={(e) =>
                setFormData({ ...formData, categoryName: e.target.value })
              }
              required
              placeholder="e.g., Serums, Moisturizers, Cleansers"
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>

          {/* Category Description */}
          <div className="space-y-2">
            <Label htmlFor="categoryDescription" className="text-slate-700">
              Description *
            </Label>
            <Textarea
              id="categoryDescription"
              value={formData.categoryDescription}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  categoryDescription: e.target.value,
                })
              }
              required
              rows={4}
              placeholder="Describe the types of products in this category..."
              className="bg-white border-slate-300 text-slate-900"
            />
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
                ? "Create Category"
                : "Update Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
