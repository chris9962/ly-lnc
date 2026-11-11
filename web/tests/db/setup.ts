import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// mỗi file test chạy trong tiến trình riêng nên có database riêng
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "lnc-test-"));
