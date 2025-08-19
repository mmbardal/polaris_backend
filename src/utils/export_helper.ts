interface ExportHeaderType<T> {
  col: Extract<keyof T, string>;
  name?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cast?: (arg: any, dep?: any) => string;
  dep?: Extract<keyof T, string>;
}

export function createCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: readonly ExportHeaderType<T>[] | ExportHeaderType<T>[],
): string;

export function createCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: readonly ExportHeaderType<T>[] | ExportHeaderType<T>[],
  pipe: NodeJS.WritableStream
): void;

export function createCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: readonly ExportHeaderType<T>[] | ExportHeaderType<T>[],
  pipe?: NodeJS.WritableStream
): string | undefined {
  let result = "";

  if (pipe !== undefined) {
    pipe.write("");
  } else {
    result = headers.map((h) => `"${h.name ?? h.col}"`).join(",") + "\n";
  }

  for (const datum of data) {
    const row = headers.map((header) => {
      const value = datum[header.col];

      if (header.cast !== undefined) {
        const depValue = header.dep !== undefined ? datum[header.dep] : undefined;

        return `"${header.cast(value, depValue)}"`;
      } else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `"${value ?? ""}"`;
      }
    }).join(",");

    if (pipe !== undefined) {
      pipe.write(row + "\n");
    } else {
      result += row + "\n";
    }
  }

  if (pipe === undefined) {
    return result;
  } else {
    pipe.end();
  }
}
