"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { availabilityService } from "@/services/availabilityService";
import { useToast } from "@/hooks/use-toast";
import type { AvailabilitySlot } from "@/types/availability-slot";
import { cn } from "@/lib/utils";

interface DeleteSlotDialogProps {
  // Accept a list of slots so users can delete multiple entries at once
  slots: AvailabilitySlot[];
  onClose: () => void;
  onSlotDeleted: () => void;
}

export function DeleteSlotDialog({
  slots,
  onClose,
  onSlotDeleted,
}: DeleteSlotDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deletableSlots = slots
    .filter((s) => s.status === "AVAILABLE")
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  const bookedSlotsCount = slots.length - deletableSlots.length;
  const isSingle = deletableSlots.length === 1;

  const handleDelete = async () => {
    if (deletableSlots.length === 0) return;

    setIsDeleting(true);
    try {
      const ids = deletableSlots.map((s) => s.slotId);
      await availabilityService.deleteBatchSlots(ids);

      toast({
        title: "Success",
        description: `Deleted ${deletableSlots.length} slot(s) successfully.`,
        variant: "success",
      });
      onSlotDeleted();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to delete slot(s).";
      toast({
        title: "Error",
        description: message,
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isOpen = slots.length > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isSingle
              ? "Delete this slot?"
              : `Delete ${deletableSlots.length} selected slots?`}
          </AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              {isSingle && deletableSlots[0] && (
                <div>
                  Are you sure you want to delete the availability at:
                  <br />
                  <span className="font-bold text-slate-900">
                    {format(
                      new Date(deletableSlots[0].startTime),
                      "HH:mm - dd/MM/yyyy"
                    )}
                  </span>
                </div>
              )}

              {!isSingle && deletableSlots.length > 0 && (
                <div>
                  This action will delete{" "}
                  <strong>{deletableSlots.length}</strong> availability slot(s)
                  within the selected range.
                  <div className="mt-2 rounded bg-slate-100 p-2 text-xs text-muted-foreground">
                    From:{" "}
                    {format(
                      new Date(deletableSlots[0].startTime),
                      "dd/MM/yyyy"
                    )}
                    <br />
                    To:{" "}
                    {format(
                      new Date(
                        deletableSlots[deletableSlots.length - 1].startTime
                      ),
                      "dd/MM/yyyy"
                    )}
                  </div>
                </div>
              )}

              {bookedSlotsCount > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-yellow-800 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    There are <strong>{bookedSlotsCount}</strong> booked slot(s)
                    in your selection. The system will keep those and only
                    delete the available ones.
                  </div>
                </div>
              )}

              <div className="pt-2 text-sm font-medium text-red-600">
                This action cannot be undone.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "bg-red-600 hover:bg-red-700 focus:ring-red-600",
              deletableSlots.length === 0 && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleDelete}
            disabled={isDeleting || deletableSlots.length === 0}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${deletableSlots.length > 1 ? "All" : ""}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
