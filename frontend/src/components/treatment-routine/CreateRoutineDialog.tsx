"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { treatmentRoutineService } from "@/services/treamentRoutineService";
import { RoutineStatus } from "@/types/treatment-routine";
import type { CreateTreatmentRoutineDto } from "@/types/treatment-routine";

const formSchema = z.object({
  routineName: z.string().min(3, "Name must be at least 3 characters"),
});

interface CreateRoutineDialogProps {
  customerId: string;
  dermatologistId: string;
  appointmentId?: string | null;
  onCancel: () => void;
}

export function CreateRoutineDialog({
  customerId,
  dermatologistId,
  appointmentId,
  onCancel,
}: CreateRoutineDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      routineName: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const dto: CreateTreatmentRoutineDto = {
        routineName: values.routineName,
        status: RoutineStatus.ACTIVE,
        customerId,
        dermatologistId,
        createdFromAppointmentId: appointmentId || undefined,
      };

      // Gọi API tạo mới
      const newRoutine = await treatmentRoutineService.create(dto);

      toast({ title: "Success", description: "Routine created." });

      // Redirect sang trang chi tiết vừa tạo
      router.replace(`/dermatologist/routine/${newRoutine.routineId}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create routine.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Routine</DialogTitle>
          <DialogDescription>
            Enter a name to start a new prescription for this patient.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="routineName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Routine Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Acne Treatment Phase 1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Start Editing
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
