import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { ajv } from "@/utils/ajv";

const setWriteAccessJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["table", "users"],
  additionalProperties: false,
  properties: {
    table: { type: "integer", description: "Table ID" },
    users: {
      type: "array",
      minItems: 0,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "integer", description: "ID of branhces"
          }
        }
      }
    }
  }
} as const satisfies JSONSchema;

export type TSetWriteAccess = FromSchema<typeof setWriteAccessJSON>;

export const setWriteAccessS = ajv.compile<TSetWriteAccess>(setWriteAccessJSON);

const changePersonalInfoJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["firstName", "lastName", "userId", "mobileNumber", "nationalCode"],
  additionalProperties: false,
  properties: {
    firstName: { type: "string", description: "First Name" },
    lastName: { type: "string", description: "Last Name" },
    userId: { type: "integer", description: "User ID" },
    mobileNumber: { type: "string", pattern: String.raw`^09\d{9}$`, description: "Mobile Number" },
    nationalCode: { type: "string", pattern: String.raw`^\d{10}$`, description: "National Code" }
  }
} as const satisfies JSONSchema;

export type TChangePersonalInfo = FromSchema<typeof changePersonalInfoJSON>;

export const changePersonalInfoS = ajv.compile<TChangePersonalInfo>(changePersonalInfoJSON);

const changeReadWritePermissionJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["userId", "tableId", "value"],
  additionalProperties: false,
  properties: {
    userId: { type: "integer", description: "User ID" },
    tableId: { type: "integer", description: "Table ID" },
    value: { type: "string", enum: ["add", "delete"], description: "Read only" }
  }
} as const satisfies JSONSchema;

export type TChangeReadWritePermission = FromSchema<typeof changeReadWritePermissionJSON>;

export const changeReadWritePermissionS = ajv.compile<TChangeReadWritePermission>(changeReadWritePermissionJSON);

const getTableReadersJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableId"],
  additionalProperties: false,
  properties: {
    tableId: { type: "integer", description: "Table ID" }
  }
} as const satisfies JSONSchema;

export type TGetTableReaders = FromSchema<typeof getTableReadersJSON>;

export const getTableReadersS = ajv.compile<TGetTableReaders>(getTableReadersJSON);

const changePermissionJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["userId", "permissions"],
  minProperties: 2,
  additionalProperties: false,
  properties: {
    userId: { type: "integer", description: "User ID" },
    active: { type: "boolean", description: "Activate or disable users" },
    permissions: { type: "array",
      items: { type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", description: "Permission Name", enum: ["groupEditing", "userEditing", "tablePermission", "tableCreate"] }
        } } }
  }
} as const satisfies JSONSchema;

export type TChangePermission = FromSchema<typeof changePermissionJSON>;

export const changePermissionS = ajv.compile<TChangePermission>(changePermissionJSON);

const searchJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["action"],
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["user", "table"], description: "Search user or table if name is empty return all users or all tables" },
    name: { type: "string" }
  }
} as const satisfies JSONSchema;

export type TSearch = FromSchema<typeof searchJSON>;

export const searchS = ajv.compile<TSearch>(searchJSON);

const activateJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["action", "userId"],
  additionalProperties: false,
  properties: { action: { type: "string", enum: ["activate", "ban"], description: "Activate or ban user" },
    userId: { type: "integer", description: "User ID" } }
} as const satisfies JSONSchema;

export type TActivate = FromSchema<typeof activateJSON>;

export const activateS = ajv.compile<TActivate>(activateJSON);

const assignJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["action", "userId", "actionId"],
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["position", "branch", "group"], description: "Type of assignment (assign position or branch or group)" },
    userId: { type: "integer", description: "User ID" },
    actionId: { type: "integer", description: "destination ID" }
  }
} as const satisfies JSONSchema;

export type TAssign = FromSchema<typeof assignJSON>;

export const assignS = ajv.compile<TAssign>(assignJSON);

const approveJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableId", "func"],
  additionalProperties: false,
  properties: {
    tableId: { type: "integer", description: "Table ID" },
    func: { type: "string", enum: ["approve", "disApprove"], description: "Approve or disApprove a template in flow" }
  }
} as const satisfies JSONSchema;

export type TApprove = FromSchema<typeof approveJSON>;

export const approveS = ajv.compile<TApprove>(approveJSON);

const retrieveTablePropertyJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableId"],
  additionalProperties: false,
  properties: {
    tableId: { type: "integer", description: "Table ID" }
  }
} as const satisfies JSONSchema;

export type TRetrieveTableProperty = FromSchema<typeof retrieveTablePropertyJSON>;

export const retrieveTablePropertyS = ajv.compile<TRetrieveTableProperty>(retrieveTablePropertyJSON);

const retrieveBranchTableJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableId"],
  additionalProperties: false,
  properties: {
    tableId: { type: "integer", description: "Table ID" },
    branchId: { type: "integer", description: "Branch ID" }
  }
} as const satisfies JSONSchema;

export type TRetrieveBranchTable = FromSchema<typeof retrieveBranchTableJSON>;

export const retrieveBranchTableS = ajv.compile<TRetrieveBranchTable>(retrieveBranchTableJSON);

const generateTableJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableName", "deadline", "fields"],
  additionalProperties: false,
  properties: {
    tableName: { type: "string", description: "Table Name" },
    deadline: { type: "string", format: "date", description: "Deadline of a serie" },
    fields: {
      type: "array",
      description: "fields property for table",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nullable", "name", "model"],
        properties: {
          comboBoxValues: {
            type: "array",
            items: {
              type: "string",
              description: "Items of combo Box"
            },
            description: "If type of field is combo Box this field is sent"
          },
          nullable: {
            type: "boolean", description: "Field can be null in sending data ?"
          },
          name: {
            type: "string", description: "Name of the field"
          },
          model: {
            type: "string",
            description: "Type of data (anyThings means simple string)",
            enum: [
              "anyThings",
              "phoneNumber",
              "homeNumber",
              "nationalCode",
              "comboBox",
              "decimal",
              "date"
            ]
          }
        }
      }
    }
  }
} as const satisfies JSONSchema;

export type TGenerateTable = FromSchema<typeof generateTableJSON>;

export const generateTableS = ajv.compile<TGenerateTable>(generateTableJSON);

const reuseTableJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["definitionId", "deadline", "fields"],
  additionalProperties: false,
  properties: {
    definitionId: { type: "integer", description: "Definition ID(table property(for reuse a table))" },
    deadline: { type: "string", format: "date", description: "Deadline of a serie" },
    fields: {
      type: "array",
      description: "fields property for table",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nullable", "name", "model"],
        properties: {
          comboBoxValues: {
            type: "array",
            items: {
              type: "string",
              description: "Items of combo Box"
            },
            description: "If type of field is combo Box this field is sent"
          },
          nullable: {
            type: "boolean", description: "Field can be null in sending data ?"
          },
          name: {
            type: "string", description: "Name of the field"
          },
          model: {
            type: "string",
            description: "Type of data (anyThings means simple string)",
            enum: [
              "anyThings",
              "phoneNumber",
              "homeNumber",
              "nationalCode",
              "comboBox",
              "decimal",
              "date"
            ]
          }
        }
      }
    }
  }
} as const satisfies JSONSchema;

export type TReuseTable = FromSchema<typeof reuseTableJSON>;

export const reuseTableS = ajv.compile<TReuseTable>(reuseTableJSON);

const editTableJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["serieId", "deadline", "fields"],
  additionalProperties: false,
  properties: {
    tableName: { type: "string", description: "Table Name" },
    serieId: { type: "integer", description: "serie ID(table property(for edit a table))" },
    deadline: { type: "string", description: "Deadline of a serie" },
    fields: {
      type: "array",
      description: "fields property for table",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nullable", "name", "model"],
        properties: {
          comboBoxValues: {
            type: "array",
            items: {
              type: "string",
              description: "Items of combo Box"
            },
            description: "If type of field is combo Box this field is sent"
          },
          nullable: {
            type: "boolean", description: "Field can be null in sending data ?"
          },
          name: {
            type: "string", description: "Name of the field"
          },
          model: {
            type: "string",
            description: "Type of data (anyThings means simple string)",
            enum: [
              "anyThings",
              "phoneNumber",
              "homeNumber",
              "nationalCode",
              "comboBox",
              "decimal",
              "date"
            ]
          }
        }
      }
    }
  }
} as const satisfies JSONSchema;

export type TEditTable = FromSchema<typeof editTableJSON>;

export const editTableS = ajv.compile<TEditTable>(editTableJSON);

const generateTableTitlesJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableName"],
  additionalProperties: false,
  properties: {
    tableName: { type: "string", description: "Table title" }
  }
} as const satisfies JSONSchema;

export type TGenerateTableTitles = FromSchema<typeof generateTableTitlesJSON>;

export const generateTableTitlesS = ajv.compile<TGenerateTableTitles>(generateTableTitlesJSON);

const exportTableJSON = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["tableId"],
  additionalProperties: false,
  properties: {
    tableId: { type: "integer", description: "Table Serie ID" }
  }
} as const satisfies JSONSchema;

export type TExportTable = FromSchema<typeof exportTableJSON>;

export const exportTableS = ajv.compile<TExportTable>(exportTableJSON);

export function comboRegexGenerator(values: string[] | undefined): string {
  let val = "";

  if (values === undefined) {
    return "";
  }

  val += "^(?:";

  for (let i = 0; i < values.length; i++) {
    val += i + 1 !== values.length ? `${values[i]}|` : values[i];
  }

  val += ")$";

  return val;
}
