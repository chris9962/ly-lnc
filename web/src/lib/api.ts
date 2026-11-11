export type ApiFail = { ok: false; message: string; status: number; field?: string };
export type ApiResult<T extends object = object> = ({ ok: true } & T) | ApiFail;

export async function callApi<T extends object = object>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await response.json()) as ApiResult<T>;
  } catch {
    return { ok: false, message: "Không kết nối được máy chủ", status: 0 };
  }
}
