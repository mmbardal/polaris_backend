import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { ajv } from "@/utils/ajv";

const getTableJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["offset", "active"],
  additionalProperties: false,
  properties: {
    offset: { type: "integer", description: "Table offset" },
    active: { type: "boolean", description: "Table status" },
    tableName: { type: "string", description: "Table name" },
    deadline: { type: "string", format: "date", description: "deadline date" }
  }
} as const satisfies JSONSchema;

export type TGetTable = FromSchema<typeof getTableJSON>;

export const getTableS = ajv.compile<TGetTable>(getTableJSON);

const getTableTitlesJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["offset"],
  additionalProperties: false,
  properties: {
    offset: { type: "integer", description: "Table offset" }
  }
} as const satisfies JSONSchema;

export type TGetTableTitles = FromSchema<typeof getTableTitlesJSON>;

export const getTableTitlesS = ajv.compile<TGetTableTitles>(getTableTitlesJSON);

const getGroupBranhcesJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: [],
  additionalProperties: false,
  properties: {
    groupId: { type: "integer", description: "Group ID" },
    branchName: { type: "string", description: "Branch Name", minLength: 3 }
  }
} as const satisfies JSONSchema;

export type TGetGroupBranhces = FromSchema<typeof getGroupBranhcesJSON>;

export const getGroupBranhcesS = ajv.compile<TGetGroupBranhces>(getGroupBranhcesJSON);

const getUserJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["Id"],
  additionalProperties: false,
  properties: {
    Id: { type: "integer", description: "ID of user" }
  }
} as const satisfies JSONSchema;

export type TGetUser = FromSchema<typeof getUserJSON>;

export const getUserS = ajv.compile<TGetUser>(getUserJSON);

const getWriteAccessJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableId"],
  additionalProperties: false,
  properties: {
    tableId: { type: "integer", description: "ID of selected table" }
  }
} as const satisfies JSONSchema;

export type TGetWriteAccess = FromSchema<typeof getWriteAccessJSON>;

export const getWriteAccessS = ajv.compile<TGetWriteAccess>(getWriteAccessJSON);

const createGroupJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "group Name" },
    branches: {
      type: "array",
      description: "List of branches",
      items: {
        type: "integer", description: "Branch ID"
      }
    }
  }
} as const satisfies JSONSchema;

export type TCreateGroup = FromSchema<typeof createGroupJSON>;

export const createGroupS = ajv.compile<TCreateGroup>(createGroupJSON);

const editGroupJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["name", "id"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", description: "ID of group" },
    name: { type: "string", description: "group Name" },
    branches: {
      type: "array",
      description: "List of branches",
      items: {
        type: "integer", description: "Branch ID"
      }
    }
  }
} as const satisfies JSONSchema;

export type TEditGroup = FromSchema<typeof editGroupJSON>;

export const editGroupS = ajv.compile<TEditGroup>(editGroupJSON);

const deleteGroupJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", description: "ID of group" }
  }
} as const satisfies JSONSchema;

export type TDeleteGroup = FromSchema<typeof deleteGroupJSON>;

export const deleteGroups = ajv.compile<TDeleteGroup>(deleteGroupJSON);

const checkJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["checkType"],
  additionalProperties: false,
  properties: {
    checkType: { type: "string", enum: ["branchHasUser", "branchHasGroup", "groupHasUser"], description: "Type of check to perform" }
  }
} as const satisfies JSONSchema;

export type TCheck = FromSchema<typeof checkJSON>;

export const checkS = ajv.compile<TCheck>(checkJSON);
