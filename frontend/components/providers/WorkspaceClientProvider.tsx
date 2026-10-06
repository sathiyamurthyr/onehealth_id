"use client";

import React, { ReactNode } from "react";
import { WorkspaceProvider } from "@/lib/workspace/WorkspaceContext";
import { FamilyProvider } from "@/lib/patient/FamilyContext";

export function WorkspaceClientProvider({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <FamilyProvider>
        {children}
      </FamilyProvider>
    </WorkspaceProvider>
  );
}
