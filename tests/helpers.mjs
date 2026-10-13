import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
export const loadData = () => ({ ...readJson("data/tms.json"), ...readJson("data/emails.json") });
