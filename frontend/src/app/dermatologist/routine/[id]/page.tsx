"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

import { TreatmentProvider, useTreatment } from "@/contexts/TreatmentContext";
import { PatientSidebar } from "@/components/treatment-routine/PatientSidebar";
import { RoutineViewer } from "@/components/treatment-routine/RoutineViewer";
import { AdjustmentPanel } from "@/components/treatment-routine/AdjustmentPanel";
import { treatmentRoutineService } from "@/services/treamentRoutineService";
import { ApiError } from "@/lib/http";
import { Button } from "@/components/ui/button";
import type { TreatmentRoutine } from "@/types/treatment-routine";
import { CreateRoutineDialog } from "@/components/treatment-routine/CreateRoutineDialog";

// --- Helper Types ---
type RoutineWithRelations = TreatmentRoutine & {
  dermatologist?: {
    dermatologistId?: string | null;
    userId?: string | null;
  } | null;
  customer?: { customerId?: string | null; userId?: string | null } | null;
};

const resolveRoutineReferences = (routine: RoutineWithRelations) => {
  const dermatologistId =
    routine.dermatologistId ??
    routine.dermatologist?.dermatologistId ??
    routine.dermatologist?.userId ??
    null;
  const customerId =
    routine.customerId ??
    routine.customer?.customerId ??
    routine.customer?.userId ??
    null;
  return { dermatologistId, customerId };
};

// --- Orchestrator ---
const CommandCenterOrchestrator = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { initializeData, activeRoutine, initializeCreateMode } =
    useTreatment();

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rawRoutineId = params?.id;
  const routineId = Array.isArray(rawRoutineId)
    ? rawRoutineId[0]
    : (rawRoutineId as string | undefined);
  const isCreateMode = routineId === "create";

  useEffect(() => {
    if (!routineId) return;

    let cancelled = false;

    // Reset Loading State
    setError(null);
    setIsBootstrapping(true);

    const bootstrap = async () => {
      console.log("🚀 Bootstrapping Routine:", routineId);

      try {
        // Handle Create Mode
        if (isCreateMode) {
          const customerId = searchParams.get("customerId");
          const dermatologistId = searchParams.get("dermatologistId");

          if (!customerId || !dermatologistId) {
            throw new Error("Missing required parameters for creation.");
          }

          await initializeCreateMode(customerId);

          if (!cancelled) setIsBootstrapping(false);
          return;
        }
        // Handle Edit/View Mode
        // 1. Fetch Routine Info to get Customer ID
        const routine = (await treatmentRoutineService.getById(
          routineId
        )) as RoutineWithRelations;

        if (cancelled) return;

        const { customerId } = resolveRoutineReferences(routine);

        if (!customerId) {
          throw new Error("Invalid routine: Missing customer reference");
        }

        // 2. Initialize Data in Context
        await initializeData(customerId, routineId);
      } catch (err) {
        if (cancelled) return;

        console.error("❌ Bootstrap error:", err);

        if (err instanceof ApiError && err.status === 404) {
          setError("Routine not found or deleted.");
        } else {
          setError("Failed to load routine details.");
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [routineId, initializeData]);

  if (isBootstrapping) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <div className="text-center">
          <h3 className="font-semibold text-slate-900">Loading Workspace</h3>
          <p className="text-sm text-slate-500">Syncing records...</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="bg-red-50 p-4 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-slate-900 text-lg">
            Unable to load routine
          </h3>
          <p className="text-slate-500">{error}</p>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/dermatologist/patients/${searchParams.get("customerId")!}`
              )
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
          </Button>
        </div>
      </div>
    );
  }

  if (isCreateMode) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans relative">
        <aside className="w-[280px] shrink-0 flex flex-col border-r border-slate-200 bg-white z-20 shadow-sm">
          <PatientSidebar />
        </aside>

        {/* Phần còn lại làm mờ hoặc trống */}
        <main className="flex-1 flex items-center justify-center bg-slate-100/50">
          <div className="text-slate-400">Creating new routine...</div>
        </main>

        <CreateRoutineDialog
          customerId={searchParams.get("customerId")!}
          dermatologistId={searchParams.get("dermatologistId")!}
          appointmentId={searchParams.get("appointmentId")}
          onCancel={() => router.back()}
        />
      </div>
    );
  }

  // 3. Success State (Layout 3 Columns)
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <aside className="w-[280px] shrink-0 flex flex-col border-r border-slate-200 bg-white z-20 shadow-sm">
        <PatientSidebar />
      </aside>

      <main className="flex-1 relative flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto scroll-smooth p-6 pb-24">
          <div className="mx-auto max-w-4xl">
            {activeRoutine ? (
              <RoutineViewer />
            ) : (
              <div className="py-10 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Preparing view...
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="w-[400px] xl:w-[450px] shrink-0 flex flex-col border-l border-slate-200 bg-white z-30 shadow-xl transition-all duration-300">
        <AdjustmentPanel />
      </aside>
    </div>
  );
};

export default function RoutineCommandCenterPage() {
  return (
    <TreatmentProvider>
      <CommandCenterOrchestrator />
    </TreatmentProvider>
  );
}
