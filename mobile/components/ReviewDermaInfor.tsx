import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RatingComponent from "@/components/RatingComponent";
import ratingService from "@/services/ratingService";
import { DermatologistRating } from "@/types/rating.type";
import { useTranslation } from "react-i18next";

const DEFAULT_LIMIT = 5;

type ReviewDermaInforProps = {
  dermatologistId: string;
  primaryColor: string;
};

const ratingFilters: Array<{ value?: number }> = [
  { value: undefined },
  { value: 5 },
  { value: 4 },
  { value: 3 },
  { value: 2 },
  { value: 1 },
];

const ReviewDermaInfor: React.FC<ReviewDermaInforProps> = ({
  dermatologistId,
  primaryColor,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "reviewDerm" });
  const [ratings, setRatings] = useState<DermatologistRating[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(
    undefined
  );

  const fetchRatings = useCallback(
    async (requestedPage: number, append = false) => {
      if (!dermatologistId) return;

      append ? setIsLoadingMore(true) : setIsLoading(true);
      setError(null);

      try {
        const response = await ratingService.getDermatologistRatings(
          dermatologistId,
          {
            page: requestedPage,
            limit: DEFAULT_LIMIT,
            rating: ratingFilter,
          }
        );

        setTotal(response.total);
        setPage(response.page);
        const moreAvailable =
          response.items.length > 0 &&
          response.page * response.limit < response.total;
        setHasMore(moreAvailable);

        setRatings((prev) =>
          append ? [...prev, ...response.items] : response.items
        );
      } catch (err: any) {
        setError(err?.message || t("error"));
        setHasMore(false);
        if (!append) {
          setRatings([]);
        }
      } finally {
        append ? setIsLoadingMore(false) : setIsLoading(false);
      }
    },
    [dermatologistId, ratingFilter, t]
  );

  useEffect(() => {
    fetchRatings(1, false);
  }, [fetchRatings]);

  const averageRating = useMemo(() => {
    if (!ratings.length) return 0;
    const sum = ratings.reduce((acc, item) => acc + (item.rating || 0), 0);
    return Number((sum / ratings.length).toFixed(1));
  }, [ratings]);

  const handleSelectRatingFilter = (value?: number) => {
    if (ratingFilter === value) return;
    setRatingFilter(value);
  };

  const handleShowMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    fetchRatings(nextPage, true);
  };

  const renderReview = (rating: DermatologistRating) => {
    const avatarUrl = rating.customer?.user?.photoUrl || null;
    const fullName = rating.customer?.user?.fullName || t("anonymous");
    const createdAt = rating.createdAt
      ? new Date(rating.createdAt).toLocaleDateString()
      : "";

    return (
      <View key={rating.ratingId} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Image
            style={styles.avatar}
            source={
              avatarUrl
                ? { uri: avatarUrl }
                : require("@/assets/images/icon.png")
            }
          />
          <View style={styles.reviewHeaderText}>
            <Text style={styles.reviewerName}>{fullName}</Text>
            <Text style={styles.reviewDate}>{createdAt}</Text>
          </View>
        </View>
        <RatingComponent
          value={rating.rating}
          readOnly
          size={18}
          style={styles.stars}
        />
        {rating.content ? (
          <Text style={styles.reviewContent}>{rating.content}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("title")}</Text>
        <Text style={styles.subtitle}>
          {total > 0
            ? t("subtitleWithData", { average: averageRating, total })
            : t("subtitleEmpty")}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {ratingFilters.map((filter, index) => {
          const isActive = ratingFilter === filter.value;
          const label = filter.value
            ? t("filters.star", { value: filter.value })
            : t("filters.all");
          return (
            <Pressable
              key={filter.value ?? "all"}
              onPress={() => handleSelectRatingFilter(filter.value)}
              style={[
                styles.chip,
                index < ratingFilters.length - 1 && styles.chipSpacing,
                isActive && { backgroundColor: primaryColor },
              ]}
            >
              {filter.value ? (
                <View style={styles.chipContent}>
                  <Text
                    style={[styles.chipText, isActive && { color: "#fff" }]}
                  >
                    {label}
                  </Text>
                  <Ionicons
                    name="star"
                    size={16}
                    color={isActive ? "#fff" : "#FDB022"}
                    style={styles.chipIcon}
                  />
                </View>
              ) : (
                <Text style={[styles.chipText, isActive && { color: "#fff" }]}>
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading && ratings.length === 0 ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!isLoading && !ratings.length && !error ? (
        <Text style={styles.emptyText}>{t("empty")}</Text>
      ) : null}

      {ratings.map(renderReview)}

      {isLoadingMore ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : null}

      {hasMore && !isLoadingMore ? (
        <Pressable
          style={[styles.showMoreButton, { borderColor: primaryColor }]}
          onPress={handleShowMore}
        >
          <Text style={[styles.showMoreText, { color: primaryColor }]}>
            {t("showMore")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterScrollContent: {
    paddingRight: 8,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F1F3F5",
  },
  chipSpacing: {
    marginRight: 10,
  },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  chipIcon: {
    marginLeft: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
  },
  loaderWrapper: {
    paddingVertical: 20,
  },
  errorText: {
    color: "#D93025",
    fontSize: 14,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 12,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#E0E0E0",
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  reviewDate: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  stars: {
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  showMoreButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  showMoreText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ReviewDermaInfor;
