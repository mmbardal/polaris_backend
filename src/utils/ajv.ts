import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import type { FormDataFile } from "@/presentation/helpers";

export const ajv = new Ajv({ allErrors: true, multipleOfPrecision: 12, strict: "log" });

interface BufferSchemaType {
  minLength?: number;
  maxLength?: number;
}

interface FormDataSchemaType extends BufferSchemaType {
  mimeTypes?: string[];
  extensions?: string[];
}

addFormats(ajv, { mode: "fast", formats: ["email", "date", "iso-date-time"], keywords: true });

ajv.addKeyword({
  keyword: "buffer",
  compile(schema: BufferSchemaType) {
    if (schema.minLength === undefined && schema.maxLength === undefined) {
      throw new Error("at least minLength or maxLength must be provided");
    }

    return function (data) {
      if (!(data instanceof Buffer)) {
        return false;
      }

      if (schema.minLength !== undefined && data.length < schema.minLength) {
        return false;
      }

      return !(schema.maxLength !== undefined && data.length > schema.maxLength);
    };
  }
});

ajv.addKeyword({
  keyword: "formDataFile",
  schemaType: "object",
  implements: ["mimeTypes", "extensions"],
  compile(schema: FormDataSchemaType) {
    if (Object.hasOwn(schema, "mimeTypes") && !Array.isArray(schema.mimeTypes)) {
      throw new Error(`value of mimeTypes must be Array of mimeTypes: '${typeof schema.mimeTypes}'`);
    }

    if (Object.hasOwn(schema, "extensions") && !Array.isArray(schema.extensions)) {
      throw new Error(`value of extensions must be Array of file extensions: '${typeof schema.extensions}'`);
    }

    if (schema.minLength === undefined && schema.maxLength === undefined) {
      throw new Error("at least minLength or maxLength must be provided");
    }

    return function (data: Record<string, unknown>) {
      if (
        !Object.hasOwn(data, "name")
        || typeof data.name !== "string"
        || !Object.hasOwn(data, "mimeType")
        || typeof data.mimeType !== "string"
        || !Object.hasOwn(data, "file")
        || !(data.file instanceof Buffer)
      ) {
        return false;
      }

      const d = data as unknown as FormDataFile;

      if (d.name.length > 32) {
        return false;
      }

      if (schema.mimeTypes !== undefined && !schema.mimeTypes.includes(d.mimeType)) {
        return false;
      }

      if (
        schema.extensions !== undefined
        && !schema.extensions.some((ext) => d.name.toLowerCase().endsWith(ext.toLowerCase()))
      ) {
        return false;
      }

      if (schema.minLength !== undefined && d.file.length < schema.minLength) {
        return false;
      }

      return !(schema.maxLength !== undefined && d.file.length > schema.maxLength);
    };
  }
});

export interface IFormDataDeserializer {
  deserialize: [
    {
      pattern: {
        formDataFile: unknown;
      };
      output: FormDataFile;
    }
  ];
}
