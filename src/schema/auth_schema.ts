// src/schema/auth_schema.ts
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { ajv } from "@/utils/ajv";

const loginJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["username", "password"],
  additionalProperties: false,
  properties: {
    username: { type: "string", minLength: 3 },
    password: { type: "string", minLength: 6 }
  }
} as const satisfies JSONSchema;

export type TLogin = FromSchema<typeof loginJSON>;

export const loginS = ajv.compile<TLogin>(loginJSON);

const registerJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["username", "password", "accessLevel"],
  additionalProperties: false,
  properties: {
    username: { type: "string", minLength: 3 },
    password: { type: "string", minLength: 6 },
    accessLevel: { type: "string", enum: ["admin", "viewer"] }
  }
} as const satisfies JSONSchema;

export type TRegister = FromSchema<typeof registerJSON>;

export const registerS = ajv.compile<TRegister>(registerJSON);
