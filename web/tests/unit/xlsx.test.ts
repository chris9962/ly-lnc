import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildXlsx } from "@/server/xlsx";

// đọc lại file zip vừa ghi: trả về tên và nội dung từng file bên trong
function unzip(data: Uint8Array) {
  const view = Buffer.from(data);
  const files = new Map<string, string>();
  let offset = 0;
  while (view.readUInt32LE(offset) === 0x04034b50) {
    const method = view.readUInt16LE(offset + 8);
    const size = view.readUInt32LE(offset + 18);
    const nameLength = view.readUInt16LE(offset + 26);
    const extra = view.readUInt16LE(offset + 28);
    const name = view.subarray(offset + 30, offset + 30 + nameLength).toString();
    const body = view.subarray(offset + 30 + nameLength + extra, offset + 30 + nameLength + extra + size);
    files.set(name, (method === 8 ? inflateRawSync(body) : body).toString("utf8"));
    offset += 30 + nameLength + extra + size;
  }
  return files;
}

describe("buildXlsx", () => {
  it("ghi đủ các phần của một file Excel, chữ tiếng Việt và số giữ đúng kiểu", () => {
    const file = buildXlsx("Bảng điểm", [["Họ tên", "Điểm"], ["Nguyễn Văn <An>", 7.75], ["Trần Bình", null]]);
    expect(Buffer.from(file).subarray(0, 2).toString()).toBe("PK");
    const files = unzip(file);
    expect([...files.keys()]).toEqual(expect.arrayContaining(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/worksheets/sheet1.xml", "xl/styles.xml"]));
    const sheet = files.get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain("Nguyễn Văn &lt;An&gt;");
    expect(sheet).toContain("<v>7.75</v>");
    expect(files.get("xl/workbook.xml")).toContain('name="Bảng điểm"');
  });
});
