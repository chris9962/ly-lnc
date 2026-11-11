import type { Tx } from "./db";
import { auditLog } from "./db/schema";

export type AuditTarget = { type: string; id: number | null };

// nhận transaction chứ không tự mở kết nối: bản ghi audit phải cùng thành công hoặc cùng huỷ với thao tác ghi
export function writeAudit(tx: Tx, actor: { id: number } | null, action: string, target: AuditTarget, detail?: Record<string, unknown>) {
  tx.insert(auditLog)
    .values({
      at: Date.now(),
      actorId: actor?.id ?? null,
      action,
      targetType: target.type,
      targetId: target.id,
      detail: detail ? JSON.stringify(detail) : null,
    })
    .run();
}
