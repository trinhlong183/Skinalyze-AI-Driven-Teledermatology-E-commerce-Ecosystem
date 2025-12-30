"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { subscriptionService } from "@/services/subscriptionService";
import type {
  SubscriptionPlan,
  FindSubscriptionPlansDto,
} from "@/types/subscription-plan";
import { SubscriptionPlanFormModal } from "@/components/subscription-plans/SubscriptionPlanFormModal";
import { useDermatologist } from "@/contexts/DermatologistContext";

import { SubscriptionPlanToolbar } from "@/components/subscription-plans/SubscriptionPlanToolbar";
import { SubscriptionPlanList } from "@/components/subscription-plans/SubscriptionPlanList";

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const { toast } = useToast();

  const { dermatologistId, isLoading: isDermLoading } = useDermatologist();

  const [filters, setFilters] = useState<FindSubscriptionPlansDto>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(
    null
  );

  const fetchMyPlans = useCallback(
    async (currentFilters: FindSubscriptionPlansDto) => {
      setIsPlansLoading(true);
      try {
        if (!currentFilters.dermatologistId) return;

        const data = await subscriptionService.getPlans(currentFilters);
        setPlans(data);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load subscription plans.";
        toast({
          title: "Error",
          description: message,
          variant: "error",
        });
      } finally {
        setIsPlansLoading(false);
      }
    },
    [toast]
  );

  // useEffect (chạy khi 'filters' (đã debounce) thay đổi)
  useEffect(() => {
    if (filters.dermatologistId) {
      fetchMyPlans(filters);
    } else if (isDermLoading) {
      setIsPlansLoading(true);
    }
    // Context finished loading but no dermatologistId
    else if (!isDermLoading && !filters.dermatologistId) {
      setIsPlansLoading(false);
      // No need for toast here because Context has already toasted (if any)
    }
  }, [filters, isDermLoading, fetchMyPlans]);

  const handlePlanSaved = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    fetchMyPlans(filters);
  };

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      await subscriptionService.deletePlan(planToDelete.planId);
      toast({
        title: "Deleted",
        description: "Subscription plan removed successfully.",
        variant: "success",
      });
      setPlanToDelete(null);
      fetchMyPlans(filters);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete plan.";
      toast({
        title: "Error",
        description: message,
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Subscription Plans</h1>
          <p className="mt-2 text-muted-foreground">
            Create, publish, and maintain subscription offerings for your patients.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Plan
        </Button>
      </div>

      {/* Subscription Plan Toolbar */}
      <SubscriptionPlanToolbar
        dermatologistId={dermatologistId || undefined}
        onFiltersChange={setFilters}
      />

      {/* Subscription Plan List */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <SubscriptionPlanList
          isLoading={isDermLoading || isPlansLoading}
          plans={plans}
          onEdit={handleOpenEditModal}
          onDelete={setPlanToDelete}
        />
      </div>

      {/* Modal Create/Edit */}
      <SubscriptionPlanFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlanSaved={handlePlanSaved}
        initialData={editingPlan}
      />

      {/* Dialog Confirm Delete */}
      <AlertDialog
        open={!!planToDelete}
        onOpenChange={() => setPlanToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the plan
              <span className="font-bold">{planToDelete?.planName}</span>?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
