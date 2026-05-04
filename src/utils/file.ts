import { statSync } from "fs";
import { fileURLToPath } from "url";

export function fileLastModified(url: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(statSync(fileURLToPath(url)).mtime);
}
