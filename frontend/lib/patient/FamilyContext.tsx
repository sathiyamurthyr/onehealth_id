"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { 
  api, 
  PatientProfile, 
  FamilyMember, 
  FamilyOverview, 
  FamilyPermissions 
} from "@/lib/api";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";

export interface ActivePersonContext {
  id: string; // patient_id
  name: string;
  onehealth_id: string;
  relationship: string;
  isSelf: boolean;
  isGuardian: boolean;
  isMinor: boolean;
  age?: number;
  gender?: string;
  blood_group?: string;
  emergency_contact?: string;
  qr_token?: string;
  permissions: FamilyPermissions;
  relationshipId?: string;
  hospitals_count?: number;
}

interface FamilyContextValue {
  primaryProfile: PatientProfile | null;
  familyMembers: FamilyMember[];
  familyOverview: FamilyOverview | null;
  selectedPersonId: string | null; // null = Self (Primary)
  activePerson: ActivePersonContext | null;
  isLoading: boolean;
  error: string | null;
  switchPerson: (personId: string | null) => void;
  refreshFamily: () => Promise<void>;
  canAccess: (permissionKey: keyof FamilyPermissions) => boolean;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { workspace, user } = useWorkspace();
  const [primaryProfile, setPrimaryProfile] = useState<PatientProfile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyOverview, setFamilyOverview] = useState<FamilyOverview | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPatientWorkspace = workspace?.workspace_type === "PATIENT";

  // Load family overview and primary profile
  const refreshFamily = useCallback(async () => {
    if (!isPatientWorkspace) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      
      const [profileRes, membersRes, overviewRes] = await Promise.all([
        api.patient.getProfile().catch((err) => {
          console.warn("Could not load primary patient profile:", err);
          return null;
        }),
        api.patient.getFamilyMembers(),
        api.patient.getFamilyOverview().catch((err) => {
          console.warn("Could not load family overview:", err);
          return null;
        }),
      ]);

      if (profileRes?.data) {
        setPrimaryProfile(profileRes.data);
      }
      if (membersRes?.data && Array.isArray(membersRes.data)) {
        setFamilyMembers(membersRes.data);
      } else {
        setFamilyMembers([]);
      }
      if (overviewRes?.data) {
        setFamilyOverview(overviewRes.data);
      }
    } catch (err: any) {
      console.error("Failed to load family healthcare context:", err);
      setError(err?.message || "Failed to load family context from server.");
    } finally {
      setIsLoading(false);
    }
  }, [isPatientWorkspace]);

  useEffect(() => {
    refreshFamily();
  }, [refreshFamily]);

  const switchPerson = useCallback((personId: string | null) => {
    setSelectedPersonId(personId);
  }, []);

  // Compute active person object
  const activePerson: ActivePersonContext | null = React.useMemo(() => {
    if (!primaryProfile && familyMembers.length === 0) return null;

    if (!selectedPersonId || selectedPersonId === primaryProfile?.id) {
      // Primary Patient (Self)
      return {
        id: primaryProfile?.id || "self",
        name: primaryProfile?.name || user?.name || "Patient",
        onehealth_id: primaryProfile?.onehealth_id || user?.username || "OHID-CITIZEN",
        relationship: "Self",
        isSelf: true,
        isGuardian: false,
        isMinor: false,
        age: primaryProfile?.age,
        gender: primaryProfile?.gender,
        blood_group: primaryProfile?.blood_group,
        emergency_contact: primaryProfile?.emergency_contact,
        qr_token: primaryProfile?.qr_token,
        permissions: {
          view_appointments: true,
          book_appointments: true,
          view_records: true,
          view_prescriptions: true,
          view_lab_reports: true,
          view_bills: true,
          manage_profile: true,
          receive_notifications: true,
        },
      };
    }

    // Selected Family Member
    const member = familyMembers.find((m) => m.member_patient_id === selectedPersonId);
    if (member) {
      return {
        id: member.member_patient_id,
        name: member.member_name,
        onehealth_id: member.member_onehealth_id,
        relationship: member.relationship,
        isSelf: false,
        isGuardian: member.is_guardian,
        isMinor: member.is_minor,
        age: member.member_age,
        gender: member.member_gender,
        blood_group: member.member_blood_group,
        emergency_contact: member.member_emergency_contact,
        qr_token: member.member_qr_token,
        permissions: member.permissions || {},
        relationshipId: member.id,
        hospitals_count: member.hospitals_count,
      };
    }

    // Fallback to primary if member not found
    return {
      id: primaryProfile?.id || "self",
      name: primaryProfile?.name || user?.name || "Patient",
      onehealth_id: primaryProfile?.onehealth_id || user?.username || "OHID-CITIZEN",
      relationship: "Self",
      isSelf: true,
      isGuardian: false,
      isMinor: false,
      permissions: {
        view_appointments: true,
        book_appointments: true,
        view_records: true,
        view_prescriptions: true,
        view_lab_reports: true,
        view_bills: true,
        manage_profile: true,
        receive_notifications: true,
      },
    };
  }, [selectedPersonId, primaryProfile, familyMembers, user]);

  const canAccess = useCallback((permissionKey: keyof FamilyPermissions): boolean => {
    if (!activePerson) return true;
    if (activePerson.isSelf) return true;
    return !!activePerson.permissions[permissionKey];
  }, [activePerson]);

  return (
    <FamilyContext.Provider
      value={{
        primaryProfile,
        familyMembers,
        familyOverview,
        selectedPersonId,
        activePerson,
        isLoading,
        error,
        switchPerson,
        refreshFamily,
        canAccess,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
}
