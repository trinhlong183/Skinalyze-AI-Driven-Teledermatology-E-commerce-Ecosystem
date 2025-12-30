import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import reviewService from "@/services/reviewService";
import productService from "@/services/productService";
import { useAuth } from "@/hooks/useAuth";
import CustomAlert from "@/components/CustomAlert"; // Make sure path is correct

export default function CreateReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { primaryColor } = useThemeColor();
  const { user } = useAuth();

  const productId = params.productId as string;
  const reviewId = params.reviewId as string;
  const existingRating = params.existingRating as string;
  const existingContent = params.existingContent as string;
  const isEditing = params.isEditing === 'true';

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(isEditing && existingRating ? parseInt(existingRating) : 0);
  const [content, setContent] = useState(isEditing && existingContent ? existingContent : "");
  const [canReview, setCanReview] = useState(true);
  
  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => {},
  });

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
      checkReviewEligibility();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const productData = await productService.getProductById(productId);
      setProduct(productData);
    } catch (error: any) {
      console.error("Error fetching product:", error);
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Failed to load product details",
        type: "error",
        onConfirm: () => {
          hideAlert();
          router.back();
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const checkReviewEligibility = async () => {
    try {
      if (!user) {
        setAlertConfig({
          visible: true,
          title: "Not Logged In",
          message: "Please log in to write a review",
          type: "warning",
          onConfirm: () => {
            hideAlert();
            router.back();
          }
        });
        return;
      }

      // Skip all checks when editing
      if (isEditing) {
        setCanReview(true);
        return;
      }

      const reviews = await reviewService.getProductReviews(productId);
      const userReview = reviews.find(review => review.userId === user.userId);
      
      if (userReview) {
        setAlertConfig({
          visible: true,
          title: "Already Reviewed",
          message: "You have already reviewed this product.",
          type: "info",
          onConfirm: () => {
            hideAlert();
            router.back();
          }
        });
        return;
      }

      setCanReview(true);
    } catch (error: any) {
      console.error("Error checking review eligibility:", error);
      setCanReview(true); // Allow review on error
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setAlertConfig({
        visible: true,
        title: "Required",
        message: "Please select a rating",
        type: "warning",
        onConfirm: hideAlert
      });
      return;
    }

    if (!content.trim()) {
      setAlertConfig({
        visible: true,
        title: "Required",
        message: "Please write a review",
        type: "warning",
        onConfirm: hideAlert
      });
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        productId,
        rating,
        content: content.trim(),
      };

      if (isEditing && reviewId) {
        await reviewService.updateReview(reviewId, reviewData);
        setAlertConfig({
          visible: true,
          title: "Review Updated!",
          message: "Your review has been updated successfully.",
          type: "success",
          onConfirm: () => {
            hideAlert();
            router.back();
          }
        });
      } else {
        await reviewService.postReview(reviewData);
        setAlertConfig({
          visible: true,
          title: "Review Submitted!",
          message: "Thank you for your review. It will help other customers.",
          type: "success",
          onConfirm: () => {
            hideAlert();
            router.back();
          }
        });
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);
      const message = error.message || "Failed to submit review";
      
      if (message.includes("already reviewed") || message.includes("duplicate")) {
        setAlertConfig({
          visible: true,
          title: "Already Reviewed",
          message: "You have already reviewed this product",
          type: "warning",
          onConfirm: hideAlert
        });
      } else {
        setAlertConfig({
          visible: true,
          title: "Error",
          message: message,
          type: "error",
          onConfirm: hideAlert
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color={star <= rating ? "#FFD700" : "#DDD"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = () => {
    switch (rating) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "Tap to rate";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Review' : 'Write Review'}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product Info */}
        <View style={styles.productCard}>
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.productName}</Text>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How would you rate this product?</Text>
          {renderStars()}
          <Text style={[styles.ratingText, { color: primaryColor }]}>
            {getRatingText()}
          </Text>
        </View>

        {/* Review Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Write your review <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share your experience with this product. How was the quality? Would you recommend it to others?"
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {content.length}/500 characters
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Review Tips:</Text>
          <Text style={styles.tipText}>• Be honest and helpful</Text>
          <Text style={styles.tipText}>• Focus on product quality and your experience</Text>
          <Text style={styles.tipText}>• Mention how the product met your expectations</Text>
          <Text style={styles.tipText}>• Keep it relevant and respectful</Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: submitting || rating === 0 || !canReview ? "#CCC" : primaryColor },
          ]}
          onPress={handleSubmitReview}
          disabled={submitting || rating === 0 || !canReview}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>{isEditing ? 'Update Review' : 'Submit Review'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Integrated Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        confirmText="OK"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  required: {
    color: "#FF3B30",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    minHeight: 120,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 8,
  },
  tipsSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 4,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});