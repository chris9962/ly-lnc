// dựng đường dẫn giữ các bộ lọc khác, đổi bộ lọc thì về trang 1
export function hrefWith(path: string, params: Record<string, string | number | undefined>, change: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...change, page: undefined })) if (value !== undefined && value !== "") search.set(key, String(value));
  return search.size ? `${path}?${search}` : path;
}
