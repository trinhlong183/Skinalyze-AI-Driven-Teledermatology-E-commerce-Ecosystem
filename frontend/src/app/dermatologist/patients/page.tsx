"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Eye,
  Loader2,
  Users,
  CalendarCheck,
  AlarmClock,
  FileCheck,
} from "lucide-react";

import { dermatologistService } from "@/services/dermatologistService";
import { useDebounce } from "@/hooks/use-debounce";
import type {
  GetMyPatientsDto,
  PatientListItemDto,
} from "@/types/dermatologist";
import { useToast } from "@/hooks/use-toast";

export default function PatientManagementPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [patients, setPatients] = useState<PatientListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  const stats = useMemo(() => {
    const upcoming = patients.filter(
      (patient) => patient.nextAppointment
    ).length;
    const today = patients.filter(
      (patient) => patient.nextAppointment?.isToday
    ).length;
    const completed = patients.filter(
      (patient) => patient.lastAppointment?.status === "COMPLETED"
    ).length;

    return [
      {
        label: "Total Patients",
        value: patients.length,
        icon: Users,
        accent: "bg-sky-100 text-sky-600",
      },
      {
        label: "Upcoming Visits",
        value: upcoming,
        icon: CalendarCheck,
        accent: "bg-emerald-100 text-emerald-600",
      },
      {
        label: "Today’s Visits",
        value: today,
        icon: AlarmClock,
        accent: "bg-amber-100 text-amber-600",
      },
      {
        label: "Recently Completed",
        value: completed,
        icon: FileCheck,
        accent: "bg-indigo-100 text-indigo-600",
      },
    ];
  }, [patients]);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: GetMyPatientsDto = {
        search: debouncedSearch || undefined,
        page: 1,
        limit: 50,
      };

      const response = await dermatologistService.getMyPatients(filters);
      setPatients(response.data || []); 
    } catch (error: unknown) {
      const description =
        error instanceof Error
          ? error.message
          : "Failed to load patients list.";
      toast({
        title: "Error",
        description,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, toast]);

  // Fetch khi filter thay đổi
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // --- Helpers Render ---

  const formatLabel = (input: string) =>
    input
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const getStatusBadgeVariant = (status: string): BadgeProps["variant"] => {
    switch (status) {
      case "COMPLETED":
      case "SETTLED":
        return "success";
      case "SCHEDULED":
      case "CONFIRMED":
        return "warning";
      case "IN_PROGRESS":
        return "default";
      case "NO_SHOW":
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const renderAppointment = (
    appointment:
      | PatientListItemDto["lastAppointment"]
      | PatientListItemDto["nextAppointment"],
    options?: { highlightToday?: boolean }
  ) => {
    if (!appointment) {
      return <span className="text-muted-foreground">Not available</span>;
    }

    const date = new Date(appointment.date);
    const formattedDate = format(date, "PPpp", { locale: enUS });
    const distance = formatDistanceToNow(date, { addSuffix: true });

    const statusVariant = getStatusBadgeVariant(appointment.status);

    const statusBadge = (
      <Badge
        variant={statusVariant}
        className="text-xs font-semibold uppercase tracking-wide"
      >
        {formatLabel(appointment.status)}
      </Badge>
    );

    const content = (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900">{formattedDate}</span>
        {"type" in appointment && appointment.type && (
          <span className="text-xs text-muted-foreground font-medium">
            {formatLabel(appointment.type)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{distance}</span>
      </div>
    );

    if (
      options?.highlightToday &&
      "isToday" in appointment &&
      appointment.isToday
    ) {
      return (
        <div className="flex flex-col gap-1 text-orange-600">
          <span className="text-xs font-semibold uppercase">Today</span>
          {statusBadge}
          {content}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {statusBadge}
        {content}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
      {/* --- Header --- */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-sky-50 via-white to-white px-6 py-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Dermatologist Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Patient Management
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Quickly review your patients, the latest consultation history, and
              what is scheduled next. Stay ahead of today’s appointments at a
              glance.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, accent }) => (
            <Card key={label} className="border-none bg-white/80 shadow-none">
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* --- Filters --- */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Search className="mr-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patients by name or phone number"
              className="border-0 bg-transparent p-0 focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            className="h-11 w-full gap-2 rounded-xl border border-dashed border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            onClick={() => setSearchTerm("")}
          >
            Reset
          </Button>
        </CardContent>
      </Card>

      {/* --- Data Table --- */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              <TableHead className="w-[250px]">Patient</TableHead>
              <TableHead>Last Appointment</TableHead>
              <TableHead>Next Appointment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading
                    patients...
                  </div>
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40">
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
                    <Users className="h-8 w-8" />
                    <p className="text-sm font-medium">
                      No patients found matching your criteria.
                    </p>
                    <p className="text-xs text-slate-400">
                      Adjust your search keywords to discover more patients.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow
                  key={patient.customerId}
                  className="group border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                >
                  {/* Cột 1: Patient Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 border border-slate-200 shadow-sm">
                        <AvatarImage src={patient.photoUrl || ""} />
                        <AvatarFallback>
                          {patient.fullName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {patient.fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {patient.phone} •{" "}
                          {patient.age ? `${patient.age} yrs` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Cột 2: Last Appointment */}
                  <TableCell>
                    {renderAppointment(patient.lastAppointment)}
                  </TableCell>

                  {/* Cột 3: Next Appointment */}
                  <TableCell>
                    {renderAppointment(patient.nextAppointment, {
                      highlightToday: true,
                    })}
                  </TableCell>

                  {/* Cột 4: Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Nút Xem Chi Tiết (Profile KH) */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View patient profile"
                        onClick={() =>
                          router.push(
                            `/dermatologist/patients/${patient.customerId}`
                          )
                        }
                      >
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>

                      {/* Nút Tạo Phác Đồ (Nếu chưa có hoặc đã xong) */}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* (Optional) Footer: Pagination could go here */}
      <div className="text-right text-xs text-slate-400">
        Showing {patients.length} patients
      </div>
    </div>
  );
}
