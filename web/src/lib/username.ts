const stripMarks = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export function searchKey(text: string): string {
  return stripMarks(text).replace(/\s+/g, " ").trim();
}

export function baseUsername(fullName: string): string {
  const words = stripMarks(fullName)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "user";
  const given = words[words.length - 1];
  return given + words.slice(0, -1).map((word) => word[0]).join("");
}
