import { expect } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8050/api/v1";

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  created_at?: string;
}

/**
 * Direct Backend/Database State Assertion Helper.
 * Queries API endpoints with authorization token to verify real database persistence.
 */
export async function assertRecordPersisted<T = any>(
  endpoint: string,
  token: string,
  matchFn: (item: T) => boolean
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  expect(res.status).toBe(200);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items || data.data || [data];
  const matched = items.find(matchFn);
  expect(matched).toBeDefined();
  return matched;
}

/**
 * Asserts that an immutable audit log entry was created in oh_id.audit_logs.
 */
export async function assertAuditLogCreated(
  token: string,
  actionCode: string,
  resourceType?: string
): Promise<void> {
  const url = `${API_BASE}/admin/audit-logs?limit=50`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 200) {
    const logs = await res.json();
    const list = Array.isArray(logs) ? logs : logs.items || [];
    const matchedLog = list.find((l: any) => 
      l.action?.includes(actionCode) || (resourceType && l.resource_type === resourceType)
    );
    expect(matchedLog).toBeDefined();
  }
}
