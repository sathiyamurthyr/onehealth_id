"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DoctorConsultationWorkspace from "../../consultation/[id]/page";

export default function DoctorPatientWorkspacePage() {
  return <DoctorConsultationWorkspace />;
}
