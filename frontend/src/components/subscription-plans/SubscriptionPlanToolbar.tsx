"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FindSubscriptionPlansDto,
  SubscriptionPlanSortBy,
} from "@/types/subscription-plan";
import { Search, ArrowDown, ArrowUp } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface SubscriptionPlanToolbarProps {
  dermatologistId?: string;
  onFiltersChange: (newFilters: FindSubscriptionPlansDto) => void;
}

export function SubscriptionPlanToolbar({
  dermatologistId,
  onFiltersChange,
}: SubscriptionPlanToolbarProps) {
  const [localFilters, setLocalFilters] = useState<FindSubscriptionPlansDto>(
    {}
  );

  const debouncedFilters = useDebounce(localFilters, 500); // 500ms debounce

  useEffect(() => {
    if (dermatologistId) {
      setLocalFilters((prev) => ({
        ...prev,
        dermatologistId: dermatologistId,
      }));
    }
  }, [dermatologistId]);

  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  const handleFilterChange = (
    key: keyof FindSubscriptionPlansDto,
    value: string | number | boolean | undefined
  ) => {
    // If value is "ALL", set undefined to remove the filter
    const newValue = value === "ALL" ? undefined : value;

    setLocalFilters((prev) => ({ ...prev, [key]: newValue }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      {/* 1. Search Box */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by plan name..."
          className="pl-10"
          value={localFilters.search || ""}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        {/* 2. Filter status */}
        <Select
          value={
            localFilters.isActive === undefined
              ? "ALL"
              : localFilters.isActive
              ? "true"
              : "false"
          }
          onValueChange={(value) =>
            handleFilterChange(
              "isActive",
              value === "ALL" ? undefined : value === "true"
            )
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Hidden</SelectItem>
          </SelectContent>
        </Select>

        {/* 3. Sort By*/}
        <Select
          value={localFilters.sortBy || SubscriptionPlanSortBy.CREATED_AT}
          onValueChange={(value) => handleFilterChange("sortBy", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SubscriptionPlanSortBy.CREATED_AT}>
              Newest first
            </SelectItem>
            <SelectItem value={SubscriptionPlanSortBy.PLAN_NAME}>
              Plan name (A-Z)
            </SelectItem>
            <SelectItem value={SubscriptionPlanSortBy.BASE_PRICE}>
              Price
            </SelectItem>
            <SelectItem value={SubscriptionPlanSortBy.TOTAL_SESSIONS}>
              Sessions
            </SelectItem>
          </SelectContent>
        </Select>

        {/* --- 4. Sort Order */}
        <Select
          value={localFilters.sortOrder || "DESC"}
          onValueChange={(value) => handleFilterChange("sortOrder", value)}
        >
          <SelectTrigger className="w-[130px]">
            {localFilters.sortOrder === "ASC" ? (
              <ArrowUp className="mr-2 h-4 w-4 text-muted-foreground" />
            ) : (
              <ArrowDown className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DESC">
              <span>Descending</span>
            </SelectItem>
            <SelectItem value="ASC">
              <span>Ascending</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
