"use client";

import { differenceInYears } from "date-fns";
import { useTreatment } from "@/contexts/TreatmentContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  History,
  User as UserIcon,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RoutineStatus,
  type TimelineEvent,
  type TreatmentRoutine,
} from "@/types/treatment-routine";
import type { User } from "@/types/user";
import { Button } from "../ui/button";

// --- HELPER: Chuyển đổi Snapshot Timeline thành TreatmentRoutine hoàn chỉnh ---
const mapSnapshotToRoutine = (
  event: TimelineEvent
): TreatmentRoutine | null => {
  if (!event.routine) return null;

  // Dữ liệu từ Timeline (thường là dạng rút gọn)
  const snapshot = event.routine as any;

  // Tạo ra một object TreatmentRoutine hợp lệ để UI có thể hiển thị
  return {
    // 1. Nếu snapshot không có ID, ta dùng ID của event làm ID tạm
    routineId: snapshot.routineId || `snapshot-${event.id}`,

    // 2. Các thông tin cơ bản
    routineName: snapshot.routineName || "Historical Routine",
    status: RoutineStatus.ACTIVE,

    // 3. Mapping Details (Quan trọng nhất)
    routineDetails: snapshot.details || [],

    // 4. Các trường metadata (Lấy từ event date hoặc để trống)
    dermatologistId: "", // Không quan trọng khi view
    customerId: "", // Không quan trọng khi view
    createdFromAppointmentId: event.id,
    createdAt: event.date,
    updatedAt: event.date,
  };
};
export function PatientSidebar() {
  const {
    customer,
    timelineEvents,
    activeRoutine,
    previewRoutineSnapshot,
    isLoading,
  } = useTreatment();

  // Nếu đang load hoặc chưa có data khách hàng thì hiển thị Skeleton hoặc null
  if (!customer) {
    if (isLoading)
      return (
        <div className="p-4 text-sm text-slate-400">Loading profile...</div>
      );
    return null;
  }

  const user = customer.user as User;

  const avatarSrc = user.photoUrl ?? "";

  const displayName = (user.fullName || "Unnamed Patient").trim();

  const nameSegments = displayName
    .split(" ")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let initials = nameSegments
    .slice(0, 2)
    .map((segment) => segment[0]!.toUpperCase())
    .join("");

  if (!initials) {
    initials = "PT";
  } else if (initials.length === 1 && nameSegments[0]?.length > 1) {
    initials = nameSegments[0]!.slice(0, 2).toUpperCase();
  }

  let genderLabel: string | null = null;
  if (user.gernder !== null && user.gernder !== undefined) {
    genderLabel = user.gernder ? "Male" : "Female";
  }

  const dobValue = user.dob ?? null;
  let age: number | null = null;
  if (dobValue) {
    const parsed = new Date(dobValue);
    if (!Number.isNaN(parsed.valueOf())) {
      age = differenceInYears(new Date(), parsed);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 px-3 py-1.5 text-slate-800 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* --- PHẦN 1: THÔNG TIN CÁ NHÂN --- */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-4 mb-3">
          <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {displayName}
            </h2>
            <div className="flex items-center text-xs text-slate-500 mt-1 gap-2">
              {genderLabel && (
                <span className="flex items-center">
                  <UserIcon className="w-3 h-3 mr-1" />
                  {genderLabel}
                </span>
              )}
              {typeof age === "number" && (
                <span className="flex items-center gap-1">
                  {genderLabel && <span>•</span>}
                  {age} years old
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- Timeline --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Visit History
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {timelineEvents.length}
          </Badge>
        </div>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-4 space-y-1">
            {timelineEvents.map((event, index) => {
              // Logic kiểm tra item đang được chọn:
              // 1. So sánh routineId (nếu snapshot có ID thật)
              // 2. HOẶC so sánh createdFromAppointmentId (ID của timeline event)
              const mappedRoutine = mapSnapshotToRoutine(event);
              const isSelected =
                activeRoutine?.routineId === mappedRoutine?.routineId ||
                activeRoutine?.createdFromAppointmentId === event.id;

              return (
                <div
                  key={event.id}
                  onClick={() => {
                    // KHI CLICK: Map dữ liệu -> Set thẳng vào Context
                    if (mappedRoutine) {
                      previewRoutineSnapshot(mappedRoutine);
                    }
                  }}
                  className={cn(
                    "group relative pl-4 py-3 pr-3 rounded-lg cursor-pointer transition-all border border-transparent flex gap-3",
                    isSelected
                      ? "bg-blue-50 border-blue-100 shadow-sm"
                      : "hover:bg-slate-50 hover:border-slate-100"
                  )}
                >
                  {/* Visual Line & Dot */}
                  {index !== timelineEvents.length - 1 && (
                    <div className="absolute left-[22px] top-8 bottom-[-12px] w-[1px] bg-slate-100 group-hover:bg-slate-200" />
                  )}
                  <div
                    className={cn(
                      "relative z-10 mt-1.5 h-3 w-3 rounded-full border-2 transition-colors shrink-0",
                      isSelected
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-slate-300 group-hover:border-slate-400"
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          "text-sm font-semibold block",
                          isSelected ? "text-blue-700" : "text-slate-700"
                        )}
                      >
                        {new Date(event.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {event.type && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-4 font-normal text-slate-500 border-slate-200"
                        >
                          {event.type}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {event.doctorNote || (
                        <span className="italic text-slate-400">No notes</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}

            {timelineEvents.length === 0 && (
              <div className="text-center py-10 flex flex-col items-center text-slate-400">
                <CalendarDays className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-xs">No visit history found.</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
