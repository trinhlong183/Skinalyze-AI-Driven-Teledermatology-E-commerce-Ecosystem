"use client";

import { useState, useEffect } from "react";
import type { SkinAnalysis } from "@/types/skin-analysis";
import { productService } from "@/services/productService";
import type { Product } from "@/types/product";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import {
  FileText,
  User,
  Brain,
  Sparkles,
  Pill,
  Camera,
  Notebook,
  Stethoscope,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SkinAnalysisCardProps {
  analysis: SkinAnalysis;
}

function ProductBadge({
  productId,
  onClick,
}: {
  productId: string;
  onClick: (product: Product) => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productService.getProduct(productId);
        setProduct(data);
      } catch (error) {
        console.error("Failed to fetch product", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  if (loading) return <Badge variant="outline">Loading...</Badge>;
  if (!product) return null;

  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-secondary transition-colors"
      onClick={() => onClick(product)}
    >
      {product.productName} ({product.brand})
    </Badge>
  );
}

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-muted-foreground">
        {label}
      </span>
    </div>
    <div className="pl-6">
      {typeof value === "string" ? (
        <p className="text-base text-foreground">{value || "N/A"}</p>
      ) : (
        value
      )}
    </div>
  </div>
);

export function SkinAnalysisCard({ analysis }: SkinAnalysisCardProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const isAiScan = analysis.source === "AI_SCAN";
  const sourceLabel = isAiScan ? "AI Scan" : "Manual";

  return (
    <>
      <Card className="shadow-lg bg-secondary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <CardTitle className="text-2xl">
                Patient&apos;s Skin Analysis
              </CardTitle>
              <CardDescription className="text-blue-500 font-semibold bg-blue-100 inline-block px-2 py-1 rounded-md mt-1">
                {sourceLabel}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAiScan && (
            <>
              <div className="space-y-4">
                <InfoRow
                  icon={User}
                  label="Chief Complaint"
                  value={analysis.chiefComplaint}
                />
                <InfoRow
                  icon={Stethoscope}
                  label="Patient Symptoms"
                  value={analysis.patientSymptoms}
                />
                <InfoRow icon={Notebook} label="Notes" value={analysis.notes} />
              </div>
              <Separator />
            </>
          )}

          {isAiScan && (
            <>
              <div className="space-y-4">
                <InfoRow
                  icon={Brain}
                  label="AI Detected Disease"
                  value={
                    <Badge variant="destructive">
                      {analysis.aiDetectedDisease || "N/A"}
                    </Badge>
                  }
                />
                <InfoRow
                  icon={Sparkles}
                  label="AI Detected Condition"
                  value={
                    <Badge variant="warning">
                      {analysis.aiDetectedCondition || "N/A"}
                    </Badge>
                  }
                />
              </div>
              <InfoRow
                icon={Pill}
                label="AI Recommended Products"
                value={
                  <div className="flex flex-wrap gap-2">
                    {analysis.aiRecommendedProducts &&
                    analysis.aiRecommendedProducts.length > 0 ? (
                      analysis.aiRecommendedProducts.map((productId, i) => (
                        <ProductBadge
                          key={i}
                          productId={productId}
                          onClick={setSelectedProduct}
                        />
                      ))
                    ) : (
                      <p className="text-base text-foreground italic">N/A</p>
                    )}
                  </div>
                }
              />
              <Separator />
            </>
          )}

          {/* Images*/}
          <InfoRow
            icon={Camera}
            label="Submitted Images"
            value={
              <div className="flex gap-2 overflow-x-auto p-2">
                {analysis?.imageUrls && analysis?.imageUrls.length > 0 ? (
                  analysis?.imageUrls.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(url)}
                      className="focus:outline-none focus:ring-2 focus:ring-primary rounded-md overflow-hidden"
                    >
                      <Image
                        src={url}
                        alt={`Analysis Image ${i + 1}`}
                        width={100}
                        height={100}
                        unoptimized
                        className="rounded-md border-2 border-primary/20 object-cover"
                      />
                    </button>
                  ))
                ) : (
                  <p className="text-base text-foreground italic">
                    No images submitted.
                  </p>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Modal image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          //Click outside to close
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage}
              alt="Enlarged analysis"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              width={1200}
              height={1200}
              unoptimized
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white p-6 rounded-lg max-w-md w-full relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setSelectedProduct(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <h3 className="text-xl font-bold mb-1">
              {selectedProduct.productName}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedProduct.brand}
            </p>
            {selectedProduct.productImages &&
              selectedProduct.productImages.length > 0 && (
                <div className="mb-4">
                  <Image
                    src={selectedProduct.productImages[0]}
                    alt={selectedProduct.productName}
                    width={300}
                    height={300}
                    className="rounded-md object-cover mx-auto"
                    unoptimized
                  />
                </div>
              )}
            <div className="space-y-3 text-sm">
              <p>
                <strong className="font-semibold">Price:</strong>{" "}
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(selectedProduct.sellingPrice)}
              </p>
              {selectedProduct.categories &&
                selectedProduct.categories.length > 0 && (
                  <p>
                    <strong className="font-semibold">Category:</strong>{" "}
                    {selectedProduct.categories
                      .map((c) => c.categoryName)
                      .join(", ")}
                  </p>
                )}
              <div className="space-y-1">
                <strong className="font-semibold">Description:</strong>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedProduct.productDescription}
                </p>
              </div>
              {selectedProduct.ingredients && (
                <div className="space-y-1">
                  <strong className="font-semibold">Ingredients:</strong>
                  <p className="text-gray-700">{selectedProduct.ingredients}</p>
                </div>
              )}
              {selectedProduct.suitableFor &&
                selectedProduct.suitableFor.length > 0 && (
                  <div className="space-y-1">
                    <strong className="font-semibold">Suitable For:</strong>
                    <div className="flex flex-wrap gap-1">
                      {selectedProduct.suitableFor.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
