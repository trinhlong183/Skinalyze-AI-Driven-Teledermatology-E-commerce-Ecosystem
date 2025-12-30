"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { subscriptionService } from "@/services/subscriptionService";
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanDto,
} from "@/types/subscription-plan";

const formSchema = z.object({
  planName: z.string().min(2, "Plan name must have at least 2 characters."),
  planDescription: z.string().optional(),
  basePrice: z.coerce.number().min(0, "Price must be greater than 0."),
  totalSessions: z.coerce.number().int().min(1, "At least one session is required."),
  durationInDays: z.coerce.number().int().min(1, "Duration must be at least 1 day."),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface SubscriptionPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanSaved: () => void;
  initialData: SubscriptionPlan | null; // null = Create new, !null = Edit
}

export function SubscriptionPlanFormModal({
  isOpen,
  onClose,
  onPlanSaved,
  initialData,
}: SubscriptionPlanFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planName: "",
      planDescription: "",
      basePrice: 1000000,
      totalSessions: 5,
      durationInDays: 90,
      isActive: true,
    },
  });

  // 3. Reset form when 'initialData' changes (when opening modal)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit mode: Load data
        form.reset({
          planName: initialData.planName,
          planDescription: initialData.planDescription || "",
          basePrice: initialData.basePrice,
          totalSessions: initialData.totalSessions,
          durationInDays: initialData.durationInDays,
          isActive: initialData.isActive,
        });
      } else {
        // Create mode: Reset default values
        form.reset({
          planName: "",
          planDescription: "",
          basePrice: 1000000,
          totalSessions: 5,
          durationInDays: 90,
          isActive: true,
        });
      }
    }
  }, [isOpen, initialData, form]);

  // 4. Logic Submit
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const dto: CreateSubscriptionPlanDto = values;

      if (isEditMode) {
        await subscriptionService.updatePlan(initialData!.planId, dto);
        toast({
          title: "Success",
          description: "Subscription plan updated.",
          variant: "success",
        });
      } else {
        await subscriptionService.createPlan(dto);
        toast({
          title: "Success",
          description: "Subscription plan created.",
          variant: "success",
        });
      }
      onPlanSaved(); // Notify parent component to refresh list
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to save subscription plan.";
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Subscription Plan" : "Create Subscription Plan"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the selected plan details."
              : "Provide the information below to publish a new plan."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-6 pl-1 -mr-6 -ml-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="planName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Premium Acne Care"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="planDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the benefits of this plan..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base price (VND)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalSessions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total sessions</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="durationInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 90 (3 months)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Allow patients to view and purchase this plan.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            {isSubmitting ? "Saving..." : "Save Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
