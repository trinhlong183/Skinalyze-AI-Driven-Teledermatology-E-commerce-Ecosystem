"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

import { appointmentService } from "@/services/appointmentService";
import { Appointment, AppointmentStatus } from "@/types/appointment";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout/AdminLayout";

export default function AdminReportsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(
    AppointmentStatus.INTERRUPTED
  );
  const { toast } = useToast();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const itemsPerPage = 10;

  // 1. Tải dữ liệu (Lấy cả INTERRUPTED và DISPUTED cùng lúc)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await appointmentService.getAppointments({
          status: [AppointmentStatus.INTERRUPTED, AppointmentStatus.DISPUTED],
        });
        setAppointments(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load reported appointments.",
          variant: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // 2. Tính toán số lượng (Counts)
  const counts = useMemo(() => {
    return {
      [AppointmentStatus.INTERRUPTED]: appointments.filter(
        (a) => a.appointmentStatus === AppointmentStatus.INTERRUPTED
      ).length,
      [AppointmentStatus.DISPUTED]: appointments.filter(
        (a) => a.appointmentStatus === AppointmentStatus.DISPUTED
      ).length,
    };
  }, [appointments]);

  // 3. Lọc danh sách hiển thị theo Tab
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => a.appointmentStatus === activeTab);
  }, [appointments, activeTab]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredAppointments.length);
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput(page.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage <= 3) {
        for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
          pages.push(i);
        }
        pages.push('...');
      } else if (currentPage >= totalPages - 2) {
        pages.push('...');
        for (let i = Math.max(2, totalPages - 3); i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  // Helper render lý do (Reason)
  // const renderReason = (appointment: Appointment) => {
  //   if (appointment.terminatedReason) {
  //     return (
  //       <Badge
  //         variant="outline"
  //         className="border-red-200 bg-red-50 text-red-700"
  //       >
  //         {appointment.terminatedReason.replace(/_/g, " ")}
  //       </Badge>
  //     );
  //   }
  //   return <span className="text-muted-foreground italic">Unknown</span>;
  // };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Problematic Appointments
            </h1>
            <p className="text-muted-foreground">
              Review interrupted sessions and disputes requiring admin
              intervention.
            </p>
          </div>
        </div>

        <Tabs
          defaultValue={AppointmentStatus.INTERRUPTED}
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            {/* Tab INTERRUPTED */}
            <TabsTrigger
              value={AppointmentStatus.INTERRUPTED}
              className="relative mr-2"
            >
              Interrupted
              {counts[AppointmentStatus.INTERRUPTED] > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 px-1.5 py-0.5 h-5 min-w-[20px] rounded-full text-[10px] absolute -top-2 -right-2 flex items-center justify-center"
                >
                  {counts[AppointmentStatus.INTERRUPTED]}
                </Badge>
              )}
            </TabsTrigger>

            {/* Tab DISPUTED */}
            <TabsTrigger
              value={AppointmentStatus.DISPUTED}
              className="relative"
            >
              Disputed
              {counts[AppointmentStatus.DISPUTED] > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 px-1.5 py-0.5 h-5 min-w-[20px] rounded-full text-[10px] absolute -top-2 -right-2 flex items-center justify-center"
                >
                  {counts[AppointmentStatus.DISPUTED]}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <Card className="shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>
                  {activeTab === AppointmentStatus.INTERRUPTED
                    ? "Interrupted Cases"
                    : "Disputed Cases"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No {activeTab.toLowerCase()} appointments found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Appointment ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Dermatologist</TableHead>
                        <TableHead>Customer</TableHead>
                        {/* <TableHead>Reason</TableHead> */}
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentAppointments.map((appt) => (
                        <TableRow key={appt.appointmentId}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {appt.appointmentId.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {format(new Date(appt.startTime), "MMM d, HH:mm", {
                              locale: enUS,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {appt.dermatologist?.user?.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {appt.dermatologist?.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {appt.customer?.user?.fullName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {appt.customer?.user?.phone}
                            </div>
                          </TableCell>
                          {/* <TableCell>{renderReason(appt)}</TableCell> */}
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                router.push(
                                  `/admin/report-resolution/${appt.appointmentId}`
                                )
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600">
                      Showing {startIndex + 1} to {endIndex} of {filteredAppointments.length} reports
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="border-slate-300"
                      >
                        Previous
                      </Button>
                      <div className="flex gap-1">
                        {getPageNumbers().map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-400">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              onClick={() => handlePageChange(page as number)}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className={currentPage === page ? "bg-green-500 hover:bg-green-600" : "border-slate-300"}
                            >
                              {page}
                            </Button>
                          )
                        ))}
                      </div>
                      <Button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                        className="border-slate-300"
                      >
                        Next
                      </Button>
                      <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 ml-4">
                        <span className="text-sm text-slate-600">Go to:</span>
                        <input
                          type="text"
                          value={pageInput}
                          onChange={(e) => setPageInput(e.target.value)}
                          className="w-16 h-8 text-center border border-slate-300 rounded"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="border-slate-300"
                        >
                          Go
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
