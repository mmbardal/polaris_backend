import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { ajv } from "@/utils/ajv";

// =================================================================
// == Schemas for the Android Client
// =================================================================
// In polaris_schema.ts

const logEntryJSON = {
  type: "object",
  required: ["timestamp"],
  properties: {
    timestamp: { type: "number" },
    latitude: { type: "number", nullable: true },
    longitude: { type: "number", nullable: true },
    networkType: { type: "string", nullable: true },
    plmnId: { type: "string", nullable: true },
    tac: { type: "integer", nullable: true },
    cellId: { type: "integer", nullable: true },
    rsrp: { type: "integer", nullable: true },
    rsrq: { type: "integer", nullable: true },

    // --- ADDED FIELDS ---
    rscp: { type: "integer", nullable: true },
    ecno: { type: "integer", nullable: true },
    rxlev: { type: "integer", nullable: true },
    arfcn: { type: "integer", nullable: true },
    band: { type: "string", nullable: true }
  }
} as const satisfies JSONSchema;

// The rest of the file remains the same...

const submitLogsJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["logs"],
  additionalProperties: false,
  properties: {
    logs: {
      type: "array",
      items: logEntryJSON,
      minItems: 1
    }
  }
} as const satisfies JSONSchema;

export type TSubmitLogs = FromSchema<typeof submitLogsJSON>;

export const submitLogsS = ajv.compile<TSubmitLogs>(submitLogsJSON);

// =================================================================
// == Schemas for the React Web Panel
// =================================================================

const dateFilterJSON = {
  type: "object",
  properties: {
    startDate: { type: "number", description: "Start timestamp for filtering" },
    endDate: { type: "number", description: "End timestamp for filtering" }
  }
} as const satisfies JSONSchema;

export const getDashboardStatsJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  ...dateFilterJSON
} as const satisfies JSONSchema;

export type TGetDashboardStats = FromSchema<typeof getDashboardStatsJSON>;

export const getDashboardStatsS = ajv.compile<TGetDashboardStats>(getDashboardStatsJSON);

const getMapDataJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    startDate: { type: "number" },
    endDate: { type: "number" },
    networkType: { type: "string", enum: ["LTE", "WCDMA", "GSM"] }
  }
} as const satisfies JSONSchema;

export type TGetMapData = FromSchema<typeof getMapDataJSON>;

export const getMapDataS = ajv.compile<TGetMapData>(getMapDataJSON);

const getLogsJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["offset", "limit"],
  additionalProperties: false,
  properties: {
    offset: { type: "integer" },
    limit: { type: "integer" },
    startDate: { type: "number" },
    endDate: { type: "number" },
    sortBy: { type: "string" },
    sortOrder: { type: "string", enum: ["asc", "desc"] }
  }
} as const satisfies JSONSchema;

export type TGetLogs = FromSchema<typeof getLogsJSON>;

export const getLogsS = ajv.compile<TGetLogs>(getLogsJSON);

const getTestResultsJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["testType"],
  additionalProperties: false,
  properties: {
    testType: { type: "string", enum: ["PING", "HTTP_DOWNLOAD", "HTTP_UPLOAD", "DNS", "SMS"] },
    startDate: { type: "number" },
    endDate: { type: "number" }
  }
} as const satisfies JSONSchema;

export type TGetTestResults = FromSchema<typeof getTestResultsJSON>;

export const getTestResultsS = ajv.compile<TGetTestResults>(getTestResultsJSON);

const createTestConfigJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["testType", "target", "intervalSeconds"],
  additionalProperties: false,
  properties: {
    testType: { type: "string", enum: ["PING", "HTTP_DOWNLOAD", "HTTP_UPLOAD", "DNS", "SMS"] },
    target: { type: "string", description: "e.g., URL for HTTP, phone number for SMS" },
    intervalSeconds: { type: "integer" },
    isEnabled: { type: "boolean" }
  }
} as const satisfies JSONSchema;

export type TCreateTestConfig = FromSchema<typeof createTestConfigJSON>;

export const createTestConfigS = ajv.compile<TCreateTestConfig>(createTestConfigJSON);

const updateTestConfigJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["configId"],
  additionalProperties: false,
  properties: {
    configId: { type: "integer" },
    testType: { type: "string", enum: ["PING", "HTTP_DOWNLOAD", "HTTP_UPLOAD", "DNS", "SMS"] },
    target: { type: "string" },
    intervalSeconds: { type: "integer" },
    isEnabled: { type: "boolean" }
  }
} as const satisfies JSONSchema;

export type TUpdateTestConfig = FromSchema<typeof updateTestConfigJSON>;

export const updateTestConfigS = ajv.compile<TUpdateTestConfig>(updateTestConfigJSON);

const deleteTestConfigJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["configId"],
  additionalProperties: false,
  properties: {
    configId: { type: "integer" }
  }
} as const satisfies JSONSchema;

export type TDeleteTestConfig = FromSchema<typeof deleteTestConfigJSON>;

export const deleteTestConfigS = ajv.compile<TDeleteTestConfig>(deleteTestConfigJSON);
