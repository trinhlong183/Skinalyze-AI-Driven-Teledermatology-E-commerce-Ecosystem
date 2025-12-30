import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { productService, Product } from "@/services/productService";

// ✅ Cập nhật ProductCardProps để chấp nhận thêm aiReason
interface ProductCardProps {
  product: Product & { aiReason?: string }; // Mở rộng type Product để có thêm field tùy chọn
  onPress: () => void;
}

const ProductCard = React.memo<ProductCardProps>(({ product, onPress }) => {
  const { primaryColor } = useThemeColor();

  // 1. Tính toán giá (USD)
  const originalPriceUSD = product.sellingPrice || 0;
  const finalPriceUSD = productService.calculateDiscountedPrice(product);

  // 2. Kiểm tra giảm giá
  // API trả về salePercentage dạng string, cần parse sang float
  const salePercentVal = parseFloat(product.salePercentage);
  const hasDiscount = salePercentVal > 0;

  // 3. Xử lý hình ảnh (API trả về mảng productImages)
  const displayImage =
    product.productImages && product.productImages.length > 0
      ? product.productImages[0]
      : "https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80";

  // 4. Tính điểm đánh giá trung bình
  const averageRating = productService.calculateAverageRating(product);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* --- Image Section --- */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: displayImage }}
          style={styles.productImage}
          resizeMode="cover"
        />
        
        {/* Badge giảm giá */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round(salePercentVal)}% OFF
            </Text>
          </View>
        )}
      </View>

      {/* --- Content Section --- */}
      <View style={styles.content}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.productName || "Unknown Product"}
        </Text>

        {/* --- AI Reason --- */}
        {product.aiReason && (
          <View style={styles.reasonContainer}>
            <Ionicons name="sparkles" size={12} color="#D97706" style={{ marginTop: 2 }} />
            <Text style={styles.reasonText} numberOfLines={10}>
              {product.aiReason}
            </Text>
          </View>
        )}

        {/* Giá tiền */}
        <View style={styles.priceContainer}>
          {hasDiscount ? (
            <>
              <Text style={styles.discountedPrice}>
                {productService.formatPrice(finalPriceUSD)}
              </Text>
              <Text style={styles.originalPrice}>
                {productService.formatPrice(originalPriceUSD)}
              </Text>
            </>
          ) : (
            <Text style={styles.price}>
              {productService.formatPrice(originalPriceUSD)}
            </Text>
          )}
        </View>

        {/* Đánh giá sao */}
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>
            {averageRating > 0 ? averageRating.toFixed(1) : "New"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

ProductCard.displayName = "ProductCard";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    // Shadow cho iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow cho Android
    elevation: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 18,
    height: 36, // Giới hạn chiều cao cho 2 dòng text
  },
  
  // ✅ Styles cho phần AI Reason
  reasonContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB', // Nền vàng nhạt
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  reasonText: {
    fontSize: 11,
    color: '#92400E', // Chữ màu nâu/cam đậm
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    height: 22,
    flexWrap: "wrap", 
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3B30",
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12, 
    color: "#999",
    textDecorationLine: "line-through",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
});

export default ProductCard;