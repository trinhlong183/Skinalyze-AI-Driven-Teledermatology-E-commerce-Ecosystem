"use client";

import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SubmitHandler,
  useFieldArray,
  useForm,
  type Resolver,
} from "react-hook-form";
import { addWeeks } from "date-fns";
import { enUS } from "date-fns/locale";

import { availabilityService } from "@/services/availabilityService";
import type { CreateAvailabilityDto } from "@/types/availability-slot";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Trash2 } from "lucide-react";
import { useDermatologist } from "@/contexts/DermatologistContext";

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const workShiftSchema = z
  .object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid format (HH:mm)"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid format (HH:mm)"),
  })
  .refine((shift) => toMinutes(shift.endTime) > toMinutes(shift.startTime), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

const batchFormSchema = z
  .object({
    selectedDays: z.array(z.date()).min(1, "Select at least one day."),
    shifts: z
      .array(workShiftSchema)
      .min(1, "Add at least one shift.")
      .superRefine((shifts, ctx) => {
        const sorted = shifts
          .map((shift, index) => ({
            ...shift,
            index,
            start: toMinutes(shift.startTime),
            end: toMinutes(shift.endTime),
          }))
          .sort((a, b) => a.start - b.start);

        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const current = sorted[i];

          if (current.start < prev.end) {
            ctx.addIssue({
              code: "custom",
              message: "Shift overlaps with another entry.",
              path: [current.index, "startTime"],
            });
            ctx.addIssue({
              code: "custom",
              message: "Shift overlaps with another entry.",
              path: [prev.index, "endTime"],
            });
            break;
          }
        }
      }),
    slotDurationInMinutes: z.coerce
      .number()
      .min(5, "Duration must be 5 minutes or more."),
    price: z.coerce.number().optional(),
    repeatWeeks: z.coerce.number().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    const duration = data.slotDurationInMinutes;
    data.shifts.forEach((shift, index) => {
      const shiftDuration =
        toMinutes(shift.endTime) - toMinutes(shift.startTime);
      const fullSlots = Math.floor(shiftDuration / duration);
      if (fullSlots < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Shift is shorter than the slot duration.",
          path: ["shifts", index, "endTime"],
        });
      }
    });
  });

type BatchFormValues = z.infer<typeof batchFormSchema>;

interface CreateSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates: Date[];
  onSlotsCreated: () => void;
  defaultShift?: {
    startTime: string;
    endTime: string;
  };
}

export function CreateSlotModal({
  isOpen,
  onClose,
  selectedDates,
  onSlotsCreated,
  defaultShift,
}: CreateSlotModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarDisplayMonth, setCalendarDisplayMonth] = useState<Date>(
    new Date()
  );
  const { toast } = useToast();
  const { profile } = useDermatologist();

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema) as Resolver<BatchFormValues>,
    defaultValues: {
      selectedDays: selectedDates.length > 0 ? selectedDates : [],
      shifts: defaultShift
        ? [defaultShift]
        : [{ startTime: "08:00", endTime: "11:00" }],
      slotDurationInMinutes: 30,
      repeatWeeks: 0,
      price: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const newSelectedDates = selectedDates.length > 0 ? selectedDates : [];

      form.reset({
        selectedDays: newSelectedDates,
        shifts: defaultShift
          ? [defaultShift]
          : [{ startTime: "08:00", endTime: "11:00" }],
        slotDurationInMinutes: 30,
        repeatWeeks: 0,
        price: undefined,
      });
      // Display the month of the first selected date or current month
      if (newSelectedDates.length > 0) {
        setCalendarDisplayMonth(newSelectedDates[0]);
      } else {
        // If no dates selected, display the current month
        setCalendarDisplayMonth(new Date());
      }
    }
  }, [isOpen, selectedDates, form, defaultShift]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "shifts",
  });

  const selectedDays = form.watch("selectedDays");
  const allowRepeat = useMemo(() => {
    if (!selectedDays || selectedDays.length === 0) {
      return true;
    }
    const sortedDays = [...selectedDays].sort(
      (a, b) => a.getTime() - b.getTime()
    );
    const firstDate = sortedDays[0];
    const lastDate = sortedDays[sortedDays.length - 1];

    const diffInTime = lastDate.getTime() - firstDate.getTime();
    const diffInDays = diffInTime / (1000 * 3600 * 24);

    return diffInDays < 7;
  }, [selectedDays]);

  useEffect(() => {
    if (!allowRepeat) {
      form.setValue("repeatWeeks", 0);
    }
  }, [allowRepeat, form]);

  const onSubmit: SubmitHandler<BatchFormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const allBlocks: CreateAvailabilityDto["blocks"] = [];

      for (let week = 0; week <= values.repeatWeeks; week++) {
        for (const day of values.selectedDays) {
          const targetDay = addWeeks(day, week);

          for (const shift of values.shifts) {
            const [startHour, startMinute] = shift.startTime
              .split(":")
              .map(Number);
            const [endHour, endMinute] = shift.endTime.split(":").map(Number);

            const startDate = new Date(targetDay);
            startDate.setHours(startHour, startMinute, 0, 0);

            const endDate = new Date(targetDay);
            endDate.setHours(endHour, endMinute, 0, 0);

            allBlocks.push({
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              slotDurationInMinutes: values.slotDurationInMinutes,
              price: values.price,
            });
          }
        }
      }

      const result = await availabilityService.createBatchSlots({
        blocks: allBlocks,
      });
      toast({
        title: "Success",
        description: `${result.message}`,
        variant: "success",
      });
      onSlotsCreated();
      onClose();
    } catch (error: unknown) {
      console.error("Failed to create availability:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create availability.";
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Availability Slots</DialogTitle>
          <DialogDescription>
            Configure working shifts for the selected days.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-6 pl-1 -mr-6 -ml-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 1. Selected Days in Calendar */}
              <FormField
                control={form.control}
                name="selectedDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apply to dates</FormLabel>
                    <div className="flex justify-center">
                      <FormControl>
                        <Calendar
                          mode="multiple"
                          selected={field.value}
                          onSelect={field.onChange}
                          month={calendarDisplayMonth}
                          onMonthChange={setCalendarDisplayMonth}
                          locale={enUS}
                          className="rounded-md border p-0"
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 2. Working Shifts (Field Array) */}
              <div className="space-y-4">
                <FormLabel>Shifts</FormLabel>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-end gap-4 p-4 border rounded-lg"
                  >
                    <FormField
                      control={form.control}
                      name={`shifts.${index}.startTime`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Start (HH:mm)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`shifts.${index}.endTime`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>End (HH:mm)</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ startTime: "14:00", endTime: "17:00" })
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Shift
                </Button>
              </div>

              {/* 3. Duration & Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="slotDurationInMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment duration</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        defaultValue={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="20">20 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={
                            profile?.defaultSlotPrice
                              ? `Default (${profile.defaultSlotPrice})`
                              : "Default (free)"
                          }
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value)
                            )
                          }
                          value={(field.value as number) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 4. Repeat slots */}
              <FormField
                control={form.control}
                name="repeatWeeks"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id="repeat-checkbox"
                        disabled={!allowRepeat}
                        checked={(field.value as number) > 0}
                        onCheckedChange={(checked) => {
                          field.onChange(checked ? 1 : 0);
                        }}
                      />
                      <label
                        htmlFor="repeat-checkbox"
                        className={cn(
                          "text-sm font-medium",
                          !allowRepeat && "text-muted-foreground"
                        )}
                      >
                        Repeat for
                      </label>
                      <Input
                        type="number"
                        className="w-20"
                        min="0"
                        max="4"
                        disabled={!allowRepeat}
                        value={field.value?.toString() ?? ""}
                        onChange={(e) =>
                          field.onChange(Math.max(0, Number(e.target.value)))
                        }
                      />
                      <span
                        className={cn(
                          "text-sm",
                          !allowRepeat && "text-muted-foreground"
                        )}
                      >
                        week(s)
                      </span>
                    </div>
                    {!allowRepeat && (
                      <FormDescription>
                        Repeating is disabled when the selected range spans more
                        than one week. Select dates within the same week to
                        enable repetition.
                      </FormDescription>
                    )}
                    <FormMessage />
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
            {isSubmitting ? "Saving..." : "Create Slots"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
