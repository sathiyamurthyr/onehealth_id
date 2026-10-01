"use client";

import React, { ReactNode } from "react";
import { WorkspaceProvider } from "@/lib/workspace/WorkspaceContext";

export function WorkspaceClientProvider({ children }: { children: ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
