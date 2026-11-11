import type { FolderItem } from "@/server/folders";

export type FolderNode = FolderItem & { depth: number; path: string };

// trải cây thành danh sách theo thứ tự hiển thị, kèm độ sâu để thụt lề và đường dẫn đầy đủ để hiện trong ô chọn
export function flattenFolders(folders: FolderItem[]): FolderNode[] {
  const children = new Map<number | null, FolderItem[]>();
  for (const folder of folders) children.set(folder.parentId, [...(children.get(folder.parentId) ?? []), folder]);
  const result: FolderNode[] = [];
  const walk = (parentId: number | null, depth: number, prefix: string) => {
    for (const folder of (children.get(parentId) ?? []).sort((a, b) => a.name.localeCompare(b.name, "vi"))) {
      const path = prefix ? `${prefix} / ${folder.name}` : folder.name;
      result.push({ ...folder, depth, path });
      walk(folder.id, depth + 1, path);
    }
  };
  walk(null, 0, "");
  return result;
}

export const folderOptions = (nodes: FolderNode[]) => [{ value: "", label: "Không thuộc thư mục" }, ...nodes.map((node) => ({ value: String(node.id), label: node.path }))];
