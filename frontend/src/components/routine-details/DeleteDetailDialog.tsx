"use client";

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { routineDetailService } from "@/services/routineDetailService";
import { RoutineDetail } from "@/types/routine-detail";

interface DeleteDetailDialogProps {
  detail: RoutineDetail | null;
  onClose: () => void;
  onDetailDeleted: () => void;
}

export function DeleteDetailDialog({
  detail,
  onClose,
  onDetailDeleted,
}: DeleteDetailDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!detail) return;
    setIsDeleting(true);
    try {
      const response = await routineDetailService.remove(
        detail.routineDetailId
      );
      toast({
        title: "Detail deactivated",
        description: response.message || "Routine detail has been deactivated.",
        variant: "success",
      });
      onDetailDeleted();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete detail.";
      toast({
        title: "Error",
        description: message,
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={!!detail} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate routine detail?</AlertDialogTitle>
          <AlertDialogDescription>
            This will archive the latest version of{" "}
            <span className="font-bold">{detail?.description}</span> for your
            patient. You can re-create the step later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
