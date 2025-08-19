import { Ajv } from "ajv";

export const ajv = new Ajv({ allErrors: true, multipleOfPrecision: 12 });

interface BufferSchemaType {
  minLength?: number;
  maxLength?: number;
}

ajv.addKeyword({
  keyword: "buffer",
  compile(schema: BufferSchemaType) {
    if (typeof schema !== "object") {
      throw new TypeError(`value of buffer must be object: '${typeof schema}'`);
    }

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
