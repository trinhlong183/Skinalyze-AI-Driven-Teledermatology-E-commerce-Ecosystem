"use client";

import { useEffect, useState, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { routineDetailService } from "@/services/routineDetailService";
import { categoryService } from "@/services/categoryService";
import { getErrorMessage, productService } from "@/services/productService";
import {
  CreateRoutineDetailDto,
  RoutineDetail,
  ROUTINE_STEP_TYPES,
  UpdateRoutineDetailDto,
} from "@/types/routine-detail";
import type { RoutineStepType } from "@/types/routine-detail";
import type { Product, Category } from "@/types/product";

const productIdSchema = z
  .union([
    z.uuid({ message: "Product ID must be a valid UUID." }),
    z.literal(""),
  ])
  .optional();

const productItemSchema = z.object({
  productId: productIdSchema,
  productName: z
    .string()
    .min(1, "Product name is required.")
    .max(180, "Product name is too long."),
  usage: z
    .string()
    .max(160, "Usage must be 160 characters or less.")
    .optional()
    .or(z.literal("")),
  frequency: z
    .string()
    .max(160, "Frequency must be 160 characters or less.")
    .optional()
    .or(z.literal("")),
  isExternal: z.boolean(),
  note: z
    .string()
    .max(220, "Note must be 220 characters or less.")
    .optional()
    .or(z.literal("")),
  externalLink: z
    .union([
      z.url({ message: "Please enter a valid URL (https://...)." }),
      z.literal(""),
    ])
    .optional(),
});

const stepTypeSchema = z.enum(ROUTINE_STEP_TYPES);

const detailFormSchema = z
  .object({
    stepType: stepTypeSchema,
    description: z.string().optional().or(z.literal("")),
    content: z.string().min(3, "Content is required."),
    products: z
      .array(productItemSchema)
      .min(1, "Add at least one product to this step."),
  })
  .superRefine((values, ctx) => {
    if (values.stepType === "other") {
      const description = values.description?.trim() ?? "";
      if (!description) {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message: "Description is required for custom steps.",
        });
        return;
      }

      if (description.length < 3) {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message: "Description must be at least 3 characters.",
        });
      }
    }
  });

type DetailFormValues = z.infer<typeof detailFormSchema>;

type ProductFormValue = DetailFormValues["products"][number];

const createEmptyProduct = (): ProductFormValue => ({
  productId: "",
  productName: "",
  usage: "",
  frequency: "",
  isExternal: true,
  note: "",
  externalLink: "",
});

interface CreateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetailSaved: () => void;
  routineId: string;
  initialData: RoutineDetail | null;
  inventoryProductCache?: Record<string, Product>;
  onInventoryProductSelect?: (product: Product) => void;
}

const STEP_TYPE_LABELS: Record<RoutineStepType, string> = {
  morning: "Morning",
  noon: "Midday / Noon",
  evening: "Evening",
  oral: "Oral medication",
  other: "Other / Custom",
};

const STEP_TYPE_OPTIONS = ROUTINE_STEP_TYPES.map((value) => ({
  value,
  label: STEP_TYPE_LABELS[value],
}));

const isRoutineStepType = (
  value: string | null | undefined
): value is RoutineStepType =>
  typeof value === "string" &&
  (ROUTINE_STEP_TYPES as readonly string[]).includes(value);

export function CreateDetailModal({
  isOpen,
  onClose,
  onDetailSaved,
  routineId,
  initialData,
  inventoryProductCache,
  onInventoryProductSelect,
}: CreateDetailModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!initialData;
  const [inventoryCache, setInventoryCache] = useState<Record<string, Product>>(
    () => inventoryProductCache ?? {}
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const categoriesLoadedRef = useRef(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const debouncedInventorySearch = useDebounce(inventorySearchTerm, 400);
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  const ALL_CATEGORIES_VALUE = "all";
  const [inventoryCategoryId, setInventoryCategoryId] =
    useState<string>(ALL_CATEGORIES_VALUE);
  const [inventoryOnlyInStock, setInventoryOnlyInStock] = useState(false);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [productPickerIndex, setProductPickerIndex] = useState<number | null>(
    null
  );

  const form = useForm<DetailFormValues>({
    resolver: zodResolver(detailFormSchema),
    defaultValues: {
      description: "",
      content: "",
      products: [createEmptyProduct()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const watchedProducts = form.watch("products");
  const selectedStepType = form.watch("stepType");

  useEffect(() => {
    if (!inventoryProductCache) {
      return;
    }

    setInventoryCache((prev) => ({
      ...prev,
      ...inventoryProductCache,
    }));
  }, [inventoryProductCache]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (categoriesLoadedRef.current) {
      return;
    }

    let cancelled = false;
    setIsCategoriesLoading(true);

    categoryService
      .getCategories()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setCategories(data);
        categoriesLoadedRef.current = true;
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        categoriesLoadedRef.current = false;
        const message = getErrorMessage(
          error,
          "Failed to load product categories"
        );
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsCategoriesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, toast]);

  useEffect(() => {
    if (productPickerIndex === null || !isOpen) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setIsInventoryLoading(true);

    productService
      .getProducts(
        {
          page: 1,
          limit: 20,
          search: debouncedInventorySearch || undefined,
          categoryId:
            inventoryCategoryId === ALL_CATEGORIES_VALUE
              ? undefined
              : inventoryCategoryId,
          inStock: inventoryOnlyInStock ? true : undefined,
        },
        { signal: controller.signal }
      )
      .then((result) => {
        if (cancelled) {
          return;
        }
        setInventoryProducts(result.products);
        setInventoryCache((prev) => {
          if (!result.products.length) {
            return prev;
          }
          const next = { ...prev };
          result.products.forEach((product) => {
            if (product.productId) {
              next[product.productId] = product;
            }
          });
          return next;
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = getErrorMessage(error, "Failed to fetch products");
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsInventoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    debouncedInventorySearch,
    inventoryCategoryId,
    inventoryOnlyInStock,
    isOpen,
    productPickerIndex,
    toast,
  ]);

  useEffect(() => {
    if (productPickerIndex === null) {
      setInventorySearchTerm("");
    }
  }, [productPickerIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const sourceProducts = initialData?.products ?? [];
    const missingIds = sourceProducts
      .map((product) => product.productId?.trim())
      .filter((id): id is string => Boolean(id && !inventoryCache[id]));

    if (!missingIds.length) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        const results = await Promise.all(
          missingIds.map(async (id) => {
            try {
              return await productService.getProduct(id, {
                signal: controller.signal,
              });
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                return null;
              }
              throw error;
            }
          })
        );

        if (cancelled) {
          return;
        }

        const validProducts = results.filter((product): product is Product =>
          Boolean(product && product.productId)
        );

        if (validProducts.length) {
          setInventoryCache((prev) => {
            const next = { ...prev };
            validProducts.forEach((product) => {
              if (product.productId) {
                next[product.productId] = product;
              }
            });
            return next;
          });

          if (onInventoryProductSelect) {
            validProducts.forEach((product) => {
              onInventoryProductSelect(product);
            });
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        const message = getErrorMessage(
          error,
          "Failed to load linked products"
        );
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialData, inventoryCache, isOpen, onInventoryProductSelect, toast]);

  useEffect(() => {
    if (!isOpen) {
      setProductPickerIndex(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialData) {
      form.reset({
        ...(isRoutineStepType(initialData.stepType)
          ? { stepType: initialData.stepType }
          : {}),
        description: initialData.description ?? "",
        content: initialData.content,
        products: initialData.products?.length
          ? initialData.products.map((product) => ({
              productId: product.productId ?? "",
              productName: product.productName,
              usage: product.usage ?? "",
              frequency: product.frequency ?? "",
              isExternal: product.isExternal ?? !product.productId,
              note: product.note ?? "",
              externalLink: product.externalLink ?? "",
            }))
          : [createEmptyProduct()],
      });
    } else {
      form.reset({
        description: "",
        content: "",
        products: [createEmptyProduct()],
      });
    }
  }, [form, initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (selectedStepType !== "other") {
      form.setValue("description", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      form.clearErrors("description");
    }
  }, [form, isOpen, selectedStepType]);

  const handleSelectInventoryProduct = (index: number, product: Product) => {
    const productId = product.productId ?? "";

    form.setValue(`products.${index}.productId`, productId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    form.setValue(`products.${index}.productName`, product.productName, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    form.setValue(`products.${index}.isExternal`, false, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    form.setValue(`products.${index}.externalLink`, "", {
      shouldDirty: true,
      shouldTouch: true,
    });

    if (product.productId) {
      setInventoryCache((prev) => ({
        ...prev,
        [product.productId as string]: product,
      }));
    }

    if (onInventoryProductSelect) {
      onInventoryProductSelect(product);
    }

    form.clearErrors(`products.${index}.productId`);
    setProductPickerIndex(null);
    setInventorySearchTerm("");
  };

  const handleAddProduct = () => {
    append(createEmptyProduct());
  };

  const onSubmit = async (values: DetailFormValues) => {
    setIsSubmitting(true);
    try {
      const description =
        values.stepType === "other"
          ? values.description?.trim() || undefined
          : undefined;

      const payloadBase = {
        stepType: values.stepType,
        description,
        content: values.content.trim(),
        products: values.products.map((product) => ({
          productId: product.productId?.trim() || undefined,
          productName: product.productName.trim(),
          usage: product.usage?.trim() || undefined,
          frequency: product.frequency?.trim() || undefined,
          isExternal: product.isExternal,
          note: product.note?.trim() || undefined,
          externalLink: product.externalLink?.trim() || undefined,
        })),
      } satisfies Omit<CreateRoutineDetailDto, "routineId">;

      if (isEditMode && initialData) {
        const dto: UpdateRoutineDetailDto = {
          ...payloadBase,
          routineId,
        };
        await routineDetailService.update(initialData.routineDetailId, dto);
        toast({
          title: "Success",
          description:
            "Routine detail updated. A new version has been created.",
          variant: "success",
        });
      } else {
        const dto: CreateRoutineDetailDto = {
          ...payloadBase,
          routineId,
        };
        await routineDetailService.create(dto);
        toast({
          title: "Success",
          description: "New routine detail has been created.",
          variant: "success",
        });
      }

      onDetailSaved();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Operation failed.";
      toast({
        title: "Error",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Routine Detail" : "Add New Routine Detail"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the instructions and product list for this routine step."
              : "Add a new step or phase, including the products your patient should follow."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="stepType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Step type</FormLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(value) => {
                      field.onChange(value as RoutineStepType);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a step type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STEP_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedStepType === "other" && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="E.g., Custom weekend treatment"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (instructions)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed instructions for the patient..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Products in this step
              </Label>

              {fields.map((field, index) => {
                const currentProduct = watchedProducts?.[index];
                const isExternal = currentProduct?.isExternal;
                const trimmedProductId = currentProduct?.productId?.trim();
                const linkedInventoryProduct =
                  trimmedProductId && inventoryCache[trimmedProductId]
                    ? inventoryCache[trimmedProductId]
                    : undefined;
                const isInventoryPickerOpen = productPickerIndex === index;
                const inStockCheckboxId = `inventory-in-stock-${index}`;

                return (
                  <div
                    key={field.id}
                    className="rounded-2xl border border-slate-200 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`products.${index}.productName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="E.g., Gentle cleanser"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {linkedInventoryProduct ? (
                            <div className="mt-1 space-y-1 text-xs text-slate-500">
                              <p>
                                Linked brand: {linkedInventoryProduct.brand} ·
                                Stock: {linkedInventoryProduct.stock}
                              </p>
                              {linkedInventoryProduct.categories?.length ? (
                                <p className="text-slate-400">
                                  Categories:{" "}
                                  {linkedInventoryProduct.categories
                                    .map((category) => category.categoryName)
                                    .join(", ")}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 self-end md:self-start">
                          <Popover
                            open={isInventoryPickerOpen}
                            onOpenChange={(open) => {
                              if (open) {
                                setProductPickerIndex(index);
                                const existingName = form.getValues(
                                  `products.${index}.productName`
                                );
                                if (existingName) {
                                  setInventorySearchTerm(existingName);
                                }
                              } else {
                                setProductPickerIndex((prev) =>
                                  prev === index ? null : prev
                                );
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isSubmitting}
                              >
                                Link inventory
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="w-80 space-y-3"
                            >
                              <div className="space-y-3">
                                <Input
                                  placeholder="Search products..."
                                  value={inventorySearchTerm}
                                  onChange={(event) =>
                                    setInventorySearchTerm(event.target.value)
                                  }
                                />
                                <Select
                                  value={inventoryCategoryId}
                                  onValueChange={(value) =>
                                    setInventoryCategoryId(value)
                                  }
                                  disabled={isCategoriesLoading}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Filter by category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={ALL_CATEGORIES_VALUE}>
                                      All categories
                                    </SelectItem>
                                    {categories.map((category) => (
                                      <SelectItem
                                        key={category.categoryId}
                                        value={category.categoryId}
                                      >
                                        {category.categoryName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={inStockCheckboxId}
                                    checked={inventoryOnlyInStock}
                                    onCheckedChange={(checked) =>
                                      setInventoryOnlyInStock(Boolean(checked))
                                    }
                                  />
                                  <Label
                                    htmlFor={inStockCheckboxId}
                                    className="text-xs"
                                  >
                                    Show only in-stock products
                                  </Label>
                                </div>
                                <div className="max-h-60 space-y-2 overflow-y-auto">
                                  {isInventoryLoading ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                                    </div>
                                  ) : inventoryProducts.length ? (
                                    inventoryProducts.map((product) => (
                                      <button
                                        key={
                                          product.productId ??
                                          product.productName
                                        }
                                        type="button"
                                        className="w-full rounded-md border border-slate-200 p-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                        onClick={() =>
                                          handleSelectInventoryProduct(
                                            index,
                                            product
                                          )
                                        }
                                      >
                                        <p className="text-sm font-medium text-slate-800">
                                          {product.productName}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Brand: {product.brand} · Stock:{" "}
                                          {product.stock}
                                        </p>
                                        {product.categories?.length ? (
                                          <p className="text-xs text-slate-400">
                                            {product.categories
                                              .map(
                                                (category) =>
                                                  category.categoryName
                                              )
                                              .join(", ")}
                                          </p>
                                        ) : null}
                                      </button>
                                    ))
                                  ) : (
                                    <p className="py-2 text-center text-xs text-slate-500">
                                      No products found.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="text-red-500 hover:text-red-600"
                              disabled={isSubmitting}
                              aria-label="Remove product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`products.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Linked product ID</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Inventory product UUID (optional)"
                                  {...field}
                                  disabled={isExternal}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`products.${index}.frequency`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequency</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="E.g., Morning and night"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`products.${index}.usage`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Usage amount</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="E.g., Apply a pea-sized amount"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`products.${index}.externalLink`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>External purchase link</FormLabel>
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`products.${index}.note`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Helpful reminders or storage instructions"
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`products.${index}.isExternal`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 pt-1">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(!!checked);
                                  if (checked) {
                                    form.setValue(
                                      `products.${index}.productId`,
                                      ""
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              This is an external product (not in inventory)
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                onClick={handleAddProduct}
                className="w-full justify-center"
                disabled={isSubmitting}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add another product
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEditMode ? "Save changes" : "Create detail"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
