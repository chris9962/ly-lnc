export type Fail = { ok: false; message: string; status: number; field?: string };
export type Result<T extends object = object> = ({ ok: true } & T) | Fail;

export const ok = <T extends object>(data: T = {} as T): { ok: true } & T => ({ ok: true, ...data });

export const fail = (message: string, status: number, field?: string): Fail => (field ? { ok: false, message, status, field } : { ok: false, message, status });

export const NOT_FOUND = fail("Không tìm thấy", 404);
export const FORBIDDEN = fail("Không có quyền", 403);
