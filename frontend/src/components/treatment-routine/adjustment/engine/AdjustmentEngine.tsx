"use client";

import { useState } from "react";
import { useTreatment } from "@/contexts/TreatmentContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit } from "lucide-react";
import { ROUTINE_STEP_TYPES } from "@/types/routine-detail";
import type { RoutineDetail, RoutineStepType } from "@/types/routine-detail";

// DnD Imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// Components
import { StagingTray } from "./StagingTray";
import { RoutineDetailEditor } from "./RoutineDetailEditor";
import {
  EngineSignalProvider,
  useEngineSignal,
} from "@/contexts/EngineSignalContext"; // Check path

// --- INNER COMPONENT ---
function AdjustmentEngineContent() {
  const { currentActiveRoutine, cancelEditing } = useTreatment();

  // Lấy hàm emitDrop để bắn tín hiệu xuống Editor con
  const { emitDrop } = useEngineSignal();

  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // State quản lý Session Mới (Chưa lưu DB)
  const [newSessions, setNewSessions] = useState<RoutineDetail[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Lọc lấy các Session đang Active từ DB
  const dbDetails = (currentActiveRoutine?.routineDetails ?? []).filter(
    (d) => d.isActive !== false
  );

  // --- Handlers ---

  const handleAddSession = (type: RoutineStepType) => {
    if (!currentActiveRoutine) return;

    const tempDetail: RoutineDetail = {
      routineDetailId: `temp-${crypto.randomUUID()}`,
      routineId: currentActiveRoutine.routineId,
      stepType: type,
      content: "",
      products: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNewSessions((prev) => [...prev, tempDetail]);
  };

  const handleCancelNewSession = (tempId: string) => {
    setNewSessions((prev) => prev.filter((s) => s.routineDetailId !== tempId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    // Nếu thả ra ngoài vùng droppable -> Bỏ qua
    if (!over) return;

    // --- LOGIC KÉO TỪ TRAY -> SESSION ---
    // Kiểm tra kỹ type để đảm bảo kéo đúng vật thể vào đúng chỗ
    const isTrayItem = active.data.current?.type === "TRAY_ITEM";
    const isSessionContainer = over.data.current?.type === "SESSION_CONTAINER";

    if (isTrayItem && isSessionContainer) {
      const productData = active.data.current?.product;
      const targetDetail = over.data.current?.detail;

      if (productData && targetDetail) {
        // Bắn tín hiệu xuống Editor
        emitDrop(targetDetail.routineDetailId, productData);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Edit className="w-4 h-4" /> Adjustment Mode
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={cancelEditing}>
          Exit
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* 1. Staging Tray (Nguồn kéo) */}
        <StagingTray />

        {/* 2. Scrollable Sessions Area */}
        <div className="flex-1 overflow-hidden bg-slate-100/50">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6 pb-32">
              {/* A. Các Session Đã Có (DB) */}
              {dbDetails.map((detail) => (
                <RoutineDetailEditor
                  key={detail.routineDetailId}
                  detail={detail}
                  isNew={false}
                />
              ))}

              {/* B. Các Session Mới Tạo (Temp) */}
              {newSessions.map((detail) => (
                <RoutineDetailEditor
                  key={detail.routineDetailId}
                  detail={detail}
                  isNew={true}
                  onCancelNew={() =>
                    handleCancelNewSession(detail.routineDetailId)
                  }
                />
              ))}

              {/* C. Nút Thêm Session */}
              <div className="pt-4">
                <Separator className="mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Add New Session
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ROUTINE_STEP_TYPES.map((type) => (
                    <Button
                      type="button" // Thêm type button để tránh submit form ngoài ý muốn
                      key={type}
                      variant="outline"
                      size="sm"
                      className="justify-start capitalize"
                      onClick={() => handleAddSession(type)}
                    >
                      <Plus className="w-3 h-3 mr-2" /> {type}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Drag Overlay (Hiệu ứng khi kéo) */}
        <DragOverlay>
          {activeDragItem?.type === "TRAY_ITEM" && (
            <div className="bg-white p-2 rounded shadow-lg border border-blue-500 w-[150px] opacity-90 rotate-2 cursor-grabbing">
              <p className="text-xs font-bold truncate">
                {activeDragItem.product.productName}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// --- MAIN EXPORT ---
export function AdjustmentEngine() {
  return (
    <EngineSignalProvider>
      <AdjustmentEngineContent />
    </EngineSignalProvider>
  );
}
