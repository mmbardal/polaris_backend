import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { IFormDataDeserializer } from "@/utils/ajv";
import { ajv } from "@/utils/ajv";

const getBranchTablesJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["offset", "active"],
  additionalProperties: false,
  properties: {
    offset: { type: "integer", description: "Offset of rows" },
    active: { type: "boolean", description: "Active tables or all tables" }
  }
} as const satisfies JSONSchema;

export type TGetBranchTables = FromSchema<typeof getBranchTablesJSON>;

export const getBranchTablesS = ajv.compile<TGetBranchTables>(getBranchTablesJSON);

const csvUploadJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["file", "tableId"],
  additionalProperties: false,
  properties: {
    file: { type: "object", formDataFile: { minLength: 1, extensions: ["zip"] } },
    tableId: { type: "string" }
  }
} as const;

export type TCsvUpload = FromSchema<typeof csvUploadJSON, IFormDataDeserializer>;

export const csvUploadS = ajv.compile<TCsvUpload>(csvUploadJSON);

const approveTableBranchJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableId", "action", "branchId"],
  additionalProperties: false,
  properties: {
    tableId: { type: "integer", description: "Table serie ID" },
    action: { type: "string", enum: ["approve", "disapprove"], description: "Approve or disapprove a data" },
    branchId: { type: "integer", description: "Branch ID" },
    comment: { type: "string", description: "Reason for accept or reject a table" }
  }
} as const satisfies JSONSchema;

export type TApproveTableBranch = FromSchema<typeof approveTableBranchJSON>;

export const approveTableBranchS = ajv.compile<TApproveTableBranch>(approveTableBranchJSON);
