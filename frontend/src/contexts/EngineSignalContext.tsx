"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/types/product";

interface DropSignal {
  targetSessionId: string;
  product: Product;
  timestamp: number; // Dùng timestamp để trigger useEffect kể cả khi drop cùng 1 sản phẩm liên tiếp
}

interface EngineSignalContextType {
  lastDrop: DropSignal | null;
  emitDrop: (targetSessionId: string, product: Product) => void;
}

const EngineSignalContext = createContext<EngineSignalContextType | undefined>(
  undefined
);

export function EngineSignalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lastDrop, setLastDrop] = useState<DropSignal | null>(null);

  const emitDrop = useCallback((targetSessionId: string, product: Product) => {
    setLastDrop({
      targetSessionId,
      product,
      timestamp: Date.now(),
    });
  }, []);

  return (
    <EngineSignalContext.Provider value={{ lastDrop, emitDrop }}>
      {children}
    </EngineSignalContext.Provider>
  );
}

export const useEngineSignal = () => {
  const context = useContext(EngineSignalContext);
  if (!context)
    throw new Error("useEngineSignal must be used within EngineSignalProvider");
  return context;
};
