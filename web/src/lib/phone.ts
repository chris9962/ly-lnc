export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+84")) digits = `0${digits.slice(3)}`;
  else if (/^84\d{9}$/.test(digits)) digits = `0${digits.slice(2)}`;
  // Excel bỏ số 0 đầu khi ô được hiểu là số
  else if (/^[1-9]\d{8}$/.test(digits)) digits = `0${digits}`;
  return /^0\d{9}$/.test(digits) ? digits : null;
}
