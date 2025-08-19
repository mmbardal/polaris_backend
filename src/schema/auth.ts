import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { ajv } from "@/utils/ajv";

const loginJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: [
    "mobileNumber",
    "n",
    "t",
    "s",
    "value",
    "nationalCode"
  ],
  additionalProperties: false,
  properties: {
    mobileNumber: { type: "string", pattern: String.raw`^09\d{9}$`, description: "Mobile number" },
    n: { type: "string", pattern: String.raw`^[a-fA-F0-9]{32}$` },
    t: { type: "integer", minimum: 1 },
    s: { type: "string", pattern: String.raw`^[a-fA-F0-9]{2,}$` },
    value: { type: "string", maxLength: 10, minLength: 4, description: "captcha value" },
    nationalCode: { type: "string", pattern: String.raw`^\d{10}$`, description: "National Code" }
  }
} as const satisfies JSONSchema;

export type TLogin = FromSchema<typeof loginJSON>;

export const loginS = ajv.compile<TLogin>(loginJSON);

const loginOtpJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: [
    "mobileNumber",
    "otp"
  ],
  additionalProperties: false,
  properties: {
    mobileNumber: { type: "string", pattern: String.raw`^09\d{9}$`, description: "Username" },
    otp: { type: "string", pattern: String.raw`^\d{6}$` }
  }
} as const;

export type TLoginOtp = FromSchema<typeof loginOtpJSON>;

export const loginOtpS = ajv.compile<TLoginOtp>(loginOtpJSON);

const registerAdminJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: [
    "firstName",
    "lastName",
    "mobileNumber",
    "nationalCode",
    "positionId"
  ],
  additionalProperties: false,
  properties: {
    mobileNumber: { type: "string", pattern: String.raw`^09\d{9}$`, description: "Mobile Number" },
    firstName: { type: "string", minLength: 5, description: "First name" },
    lastName: { type: "string", minLength: 5, description: "Last name" },
    nationalCode: { type: "string", pattern: String.raw`^\d{10}$`, description: "National Code" },
    positionId: { type: "integer", description: "Position ID" }
  }
} as const satisfies JSONSchema;

export type TRegisterAdmin = FromSchema<typeof registerAdminJSON>;

export const registerAdminS = ajv.compile<TRegisterAdmin>(registerAdminJSON);

const registerUserJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  anyOf: [
    { type: "object",
      required: [
        "mobileNumber",
        "firstName",
        "lastName",
        "branch",
        "nationalCode"
      ],
      additionalProperties: false,
      properties: {
        mobileNumber: { type: "string", pattern: String.raw`^09\d{9}$`, description: "Mobile Number" },
        branch: { type: "integer", description: "Branch ID" },
        firstName: { type: "string", minLength: 5, description: "First name" },
        lastName: { type: "string", minLength: 5, description: "Last name" },
        nationalCode: { type: "string", pattern: String.raw`^\d{10}$`, description: "National Code" }
      } }, { type: "object",
      required: [
        "mobileNumber",
        "firstName",
        "lastName",
        "group",
        "nationalCode"
      ],
      additionalProperties: false,
      properties: {
        mobileNumber: { type: "string", pattern: String.raw`^09\d{9}$`, description: "Mobile Number" },
        group: { type: "integer", description: "GroupID" },
        firstName: { type: "string", minLength: 5, description: "First name" },
        lastName: { type: "string", minLength: 5, description: "Last name" },
        nationalCode: { type: "string", pattern: String.raw`^\d{10}$`, description: "National Code" }
      } }
  ]

} as const satisfies JSONSchema;

export type TRegisterUser = FromSchema<typeof registerUserJSON>;

export const registerUserS = ajv.compile<TRegisterUser>(registerUserJSON);
