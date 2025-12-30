"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { dermatologistService } from "@/services/dermatologistService";
import type { DermatologistProfile } from "@/types/dermatologist";

interface DermatologistContextType {
  profile: DermatologistProfile | null;
  dermatologistId: string | null;
  isLoading: boolean;
}

const DermatologistContext = createContext<DermatologistContextType>({
  profile: null,
  dermatologistId: null,
  isLoading: true,
});

export function DermatologistProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<DermatologistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated || user?.role !== "dermatologist") {
      setIsLoading(false);
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await dermatologistService.getMyProfile();
        setProfile(data);
        console.log("AT DermatologistContext", data);
      } catch (error) {
        console.error("Failed to load dermatologist profile:", error);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, isAuthenticated, isAuthLoading]);

  return (
    <DermatologistContext.Provider
      value={{
        profile,
        dermatologistId: profile?.dermatologistId || null,
        isLoading,
      }}
    >
      {children}
    </DermatologistContext.Provider>
  );
}

export const useDermatologist = () => useContext(DermatologistContext);
