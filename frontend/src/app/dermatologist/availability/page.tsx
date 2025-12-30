"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { format, getDay, parse, startOfWeek, addDays } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { availabilityService } from "@/services/availabilityService";
import type { AvailabilitySlot, SlotStatus } from "@/types/availability-slot";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, X, AlertTriangle } from "lucide-react";

import { CreateSlotModal } from "@/components/availability-slots/CreateSlotModal";
import { DeleteSlotDialog } from "@/components/availability-slots/DeleteSlotDialog";
import { useRouter } from "next/navigation";
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

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: AvailabilitySlot;
}

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const detailCardRef = useRef<HTMLDivElement | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null
  );
  const [slotsToDelete, setSlotsToDelete] = useState<AvailabilitySlot[]>([]);
  const [pendingSelection, setPendingSelection] = useState<{
    slots: AvailabilitySlot[];
    dates: Date[];
    defaultShift?: { startTime: string; endTime: string };
  } | null>(null);

  const [currentView, setCurrentView] = useState<View>(Views.WEEK);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [defaultShift, setDefaultShift] = useState<
    { startTime: string; endTime: string } | undefined
  >(undefined);

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
        getDay,
        locales: { "en-US": enUS },
      }),
    []
  );

  const fetchSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const data = await availabilityService.getMySlots({
        startDate: addDays(new Date(), -30).toISOString(),
        endDate: addDays(new Date(), 90).toISOString(),
      });
      setSlots(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to load availability.";
      toast({
        title: "Error",
        description: message || "Unable to load slots.",
        variant: "error",
      });
    } finally {
      setIsLoadingSlots(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    const calendarEvents = slots.map((slot) => ({
      title:
        currentView === Views.MONTH
          ? format(new Date(slot.startTime), "HH:mm") +
            " - " +
            format(new Date(slot.endTime), "HH:mm")
          : "",
      start: new Date(slot.startTime),
      end: new Date(slot.endTime),
      resource: slot,
    }));
    setEvents(calendarEvents);
  }, [slots, currentView]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    const slot = event.resource;
    setSelectedSlot(slot);
    setSlotsToDelete([]);
    setPendingSelection(null);
    setIsModalOpen(false);
    setSelectedDates([]);

    setTimeout(() => {
      detailCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 100);
  }, []);
  // Handle select range to create slots (onSelectSlot by calendar)
  const handleSelectRange = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      const selectionStart = new Date(slotInfo.start);
      const selectionEnd = new Date(slotInfo.end);

      // Reset state before handling a new range
      setDefaultShift(undefined);
      setSlotsToDelete([]);
      setSelectedSlot(null);
      setSelectedDates([]);
      setPendingSelection(null);

      // Ensure advanced modal is closed before deciding the next action
      setIsModalOpen(false);

      // Capture default shift if the user drags within a single day
      const isTimedSelection =
        selectionStart.getHours() !== 0 ||
        selectionStart.getMinutes() !== 0 ||
        selectionEnd.getHours() !== 0 ||
        selectionEnd.getMinutes() !== 0;

      const inferredShift =
        isTimedSelection &&
        selectionStart.toDateString() === selectionEnd.toDateString()
          ? {
              startTime: format(selectionStart, "HH:mm"),
              endTime: format(selectionEnd, "HH:mm"),
            }
          : undefined;

      // Adjust selection that lands on midnight to keep date iteration inclusive
      const inclusiveEnd = new Date(selectionEnd);
      if (
        inclusiveEnd.getHours() === 0 &&
        inclusiveEnd.getMinutes() === 0 &&
        inclusiveEnd > selectionStart
      ) {
        inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
      }

      const computedDates: Date[] = [];
      const cursor = new Date(selectionStart);
      const today = new Date(new Date().setHours(0, 0, 0, 0));

      while (cursor <= inclusiveEnd) {
        if (cursor >= today) {
          computedDates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const effectiveDates =
        computedDates.length > 0
          ? computedDates
          : selectionStart >= today
          ? [new Date(selectionStart)]
          : [];

      const existingSlotsInRange = slots
        .filter((slot) => {
          const slotStart = new Date(slot.startTime);
          return slotStart >= selectionStart && slotStart < selectionEnd;
        })
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

      if (existingSlotsInRange.length > 0) {
        setPendingSelection({
          slots: existingSlotsInRange,
          dates: effectiveDates,
          defaultShift: inferredShift,
        });
        return;
      }

      setDefaultShift(inferredShift);

      if (effectiveDates.length > 0) {
        setSelectedDates(effectiveDates);
        setIsModalOpen(true);
      }
    },
    [slots]
  );

  const onSlotDeleted = () => {
    setSelectedSlot(null);
    setSlotsToDelete([]);
    setDefaultShift(undefined);
    fetchSlots();
  };

  const onSlotsCreated = () => {
    setIsModalOpen(false);
    setSlotsToDelete([]);
    setDefaultShift(undefined);
    fetchSlots();
  };

  const eventPropGetter = useCallback(
    (event: CalendarEvent) => {
      const isBooked = event.resource.status === "BOOKED";
      const isPast = event.end < new Date();
      const isSelected = selectedSlot?.slotId === event.resource.slotId;

      // Styles slot in calendar (override default CSS of react-big-calendar)
      const style = {
        backgroundColor: isBooked ? "#fecaca" : "#dcfce7",
        color: isBooked ? "#991b1b" : "#166534",
        border: isBooked ? "2px solid #f87171" : "1px solid #4ade80",
        borderRadius: "4px",
        opacity: isPast ? 0.6 : 1,
      };
      // Style for month view to show border when selected
      const className = cn(
        "p-1 text-xs cursor-pointer",
        isSelected && "outline outline-2 outline-offset-1 outline-blue-500"
      );

      return {
        className: className,
        style: style,
      };
    },
    [selectedSlot]
  );

  const dayPropGetter = useCallback((date: Date) => {
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    return {
      className: cn(isPast && "bg-gray-300 text-muted-foreground opacity-70"),
    };
  }, []);

  const getStatusColor = (status: SlotStatus) => {
    switch (status) {
      case "AVAILABLE":
        return "text-green-600";
      case "BOOKED":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Availability</h1>
          <p className="mt-2 text-muted-foreground">
            Review your calendar, delete existing slots, or drag to create new
            availability.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedDates([]);
            setSelectedSlot(null);
            setSlotsToDelete([]);
            setDefaultShift(undefined);
            setPendingSelection(null);
            setIsModalOpen(true);
          }}
          className="mt-2 md:mt-0"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Create Availability (Advanced)
        </Button>
      </div>

      <div className="h-[75vh] rounded-lg border bg-white p-4 shadow-sm">
        {isLoadingSlots && (
          <div className="text-center">Loading availability...</div>
        )}

        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.MONTH, Views.DAY]}
          step={15}
          culture="en-US"
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectRange}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={handleNavigate}
          messages={{
            next: "Next",
            previous: "Previous",
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
            agenda: "Agenda",
            date: "Date",
            time: "Time",
            event: "Slot",
            noEventsInRange: "No availability in this range.",
          }}
        />
      </div>

      {selectedSlot && (
        <Card
          ref={detailCardRef}
          className="relative mt-6 border-2 border-yellow-400 shadow-md"
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-3 text-muted-foreground"
            onClick={() => setSelectedSlot(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader>
            <CardTitle>Slot Details</CardTitle>
            <CardDescription>
              {format(new Date(selectedSlot.startTime), "HH:mm, dd/MM/yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Time
              </span>
              <p className="font-semibold">
                {format(new Date(selectedSlot.startTime), "HH:mm")} -{" "}
                {format(new Date(selectedSlot.endTime), "HH:mm")}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Price
              </span>
              <p className="font-semibold">
                {selectedSlot.price?.toLocaleString("vi-VN") || "Default"} VND
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Status
              </span>
              <p
                className={cn(
                  "font-semibold",
                  getStatusColor(selectedSlot.status)
                )}
              >
                {selectedSlot.status === "AVAILABLE" ? "Available" : "Booked"}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            {selectedSlot.status === "AVAILABLE" ? (
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedSlot) {
                    setSlotsToDelete([selectedSlot]);
                  }
                }}
              >
                Delete Slot
              </Button>
            ) : (
              <>
                <p className="mr-2 flex items-center rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-muted-foreground">
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                  Cannot delete a booked slot.
                </p>
                <Button
                  variant="default"
                  onClick={() =>
                    router.push(
                      `/dermatologist/appointment/${selectedSlot.appointmentId}`
                    )
                  }
                  disabled={!selectedSlot.appointmentId}
                >
                  View Appointment Details
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      )}

      <CreateSlotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDates={selectedDates}
        onSlotsCreated={onSlotsCreated}
        defaultShift={defaultShift}
      />

      <DeleteSlotDialog
        slots={slotsToDelete}
        onClose={() => setSlotsToDelete([])}
        onSlotDeleted={onSlotDeleted}
      />

      <AlertDialog
        open={Boolean(pendingSelection)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSelection(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing availability detected</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSelection?.slots.length ?? 0} slot(s) already exist in the
              selected range. Choose whether to delete them or create new
              availability instead.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            {pendingSelection?.dates.length === 0 && (
              <p>
                You cannot create new availability in the past, but you can
                delete the existing slots.
              </p>
            )}
            {pendingSelection && pendingSelection.slots.length > 0 && (
              <div className="rounded-md bg-slate-100 p-3 text-slate-700">
                <p className="font-medium">
                  First slot:{" "}
                  {format(
                    new Date(pendingSelection.slots[0].startTime),
                    "HH:mm - dd/MM/yyyy"
                  )}
                </p>
                {pendingSelection.slots.length > 1 && (
                  <p>
                    Last slot:{" "}
                    {format(
                      new Date(
                        pendingSelection.slots[
                          pendingSelection.slots.length - 1
                        ].startTime
                      ),
                      "HH:mm - dd/MM/yyyy"
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="outline"
                disabled={
                  !pendingSelection || pendingSelection.dates.length === 0
                }
                onClick={() => {
                  if (!pendingSelection) {
                    return;
                  }
                  if (pendingSelection.dates.length === 0) {
                    toast({
                      title: "Cannot create availability",
                      description: "Selected range is entirely in the past.",
                      variant: "error",
                    });
                    setPendingSelection(null);
                    return;
                  }
                  setDefaultShift(pendingSelection.defaultShift);
                  setSelectedDates(pendingSelection.dates);
                  setIsModalOpen(true);
                  setPendingSelection(null);
                }}
              >
                Create new slots
              </Button>
            </AlertDialogAction>
            <AlertDialogAction asChild>
              <Button
                variant="warning"
                onClick={() => {
                  if (!pendingSelection) {
                    return;
                  }
                  setSlotsToDelete(pendingSelection.slots);
                  setPendingSelection(null);
                }}
              >
                Delete existing slots
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
