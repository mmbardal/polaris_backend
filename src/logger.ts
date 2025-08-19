import { writeFile } from "node:fs";

export function logError(e: unknown): void {
  writeFile(
    "errors.log",
    `${Date.now()} - Message: ${(e as Error).message} \n Stack:\n${(e as Error).stack}\n\n`,
    (err) => {
      if (err !== null) {
        // console.error(err);
      }
    }
  );
}
