import { fetchJSON } from "./client";
import { Patient } from "../types";

export const oneHealthIdApi = {
  lookup: (onehealthId: string) =>
    fetchJSON<Patient>(`/patients/verify-qr/${encodeURIComponent(onehealthId)}`),

  resolveQr: (qrToken: string, scannedBy: string = "staff") =>
    fetchJSON<Patient>("/patients/qr/resolve", {
      method: "POST",
      body: JSON.stringify({ qr_token: qrToken, scanned_by: scannedBy }),
    }),

  rotateToken: (patientId: string) =>
    fetchJSON<Patient>(`/patients/${patientId}/qr/rotate`, {
      method: "POST",
    }),
};
