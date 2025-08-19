import type { ValidateFunction } from "ajv";
import { Ajv } from "ajv";
import AdmZip from "adm-zip";
import type { CastingContext } from "csv-parse/sync";
import { parse } from "csv-parse/sync";
import type { DomainManagerType } from "@/domain/index";
import type { BranchPayload } from "@/domain/types";
import { CommonCodes } from "@/domain/errors";
import type { TCsvUpload } from "@/schema/vahed_schema";
import { DomainException } from "@/utils/errors";

// --- انواع داده مشترک (بهتر است در یک فایل جدا باشند) ---
export interface ErrorMessage {
  col: string; error: string; index?: number;
}

export interface TroubledError {
  messages: ErrorMessage[]; index: number;
}

interface prop {
  comboBoxValues: string[];
  model: "anyThings" | "phoneNumber" | "homeNumber" | "nationalCode" | "comboBox" | "decimal" | "date";
  name: string;
  nullable: boolean;
  regex: string;
}

export interface BulkInsertResponse {
  success: boolean; errors: { troubled: TroubledError[] };
}

interface JSONSchemaProperty {
  type: string | string[];
  format?: string;
  enum?: string[];
  pattern?: string;
}

const CHUNK_SIZE = 500;
const cast = (v: string, c: CastingContext) => (c.header ? v : (v === "NULL" || v === "null" || v === "" ? null : v.trim()));

export class Validator {
  constructor(domain: DomainManagerType) {
    this.domain = domain;
  }

  private readonly domain: DomainManagerType;
  private readonly ajv = new Ajv({ allErrors: true, coerceTypes: true });

  private static _parseAndValidateCsv<T>(fileBuffer: Buffer, validator: ValidateFunction<T>):
  { unprocessableEntities: TroubledError[]; rows: T[] } {
    const unprocessableEntities: TroubledError[] = [];
    let zip: AdmZip;

    try {
      zip = new AdmZip(fileBuffer);
    } catch (error) {
      throw new DomainException(CommonCodes.invalidZipFileCode, error instanceof Error ? error.message : "Unknown zip error");
    }

    if (zip.getEntryCount() !== 1) {
      throw new DomainException(CommonCodes.invalidZipFileCode, CommonCodes.invalidZipFileDesc);
    }

    const data = zip.getEntries()[0].getData().toString()
      .replaceAll("ي", "ی")
      .replaceAll("ك", "ک");
    const rows: T[] = parse(data, { bom: true, skip_empty_lines: true, columns: true, cast, autoParse: false }) as T[];

    for (const [index, row] of rows.entries()) {
      if (unprocessableEntities.length >= 20) {
        break;
      }

      if (!validator(row)) {
        const messages = validator.errors?.map((e) => ({ col: e.instancePath.replace("/", ""), error: e.message ?? "" })) ?? [];
        unprocessableEntities.push({ index: index + 2, messages });
      }
    }

    return { unprocessableEntities, rows };
  }

  /**
   * یک متد استاتیک برای ساخت JSON Schema از تنظیمات داینامیک.
   */

  private static _generateSchema(columns: prop[]) {
    const properties: Record<string, JSONSchemaProperty> = {};
    const required: string[] = [];

    for (const column of columns) {
      // Using the new JSONSchemaProperty interface for better type safety
      const propertyDefinition: Partial<JSONSchemaProperty> = {};
      let baseType: string;

      switch (column.model) {
        case "decimal":
          baseType = "number";
          break;

        case "date":
          baseType = "string";

          // Uses a standard date format. Can be changed to 'date-time' if needed.
          propertyDefinition.pattern = column.regex;
          break;

        case "comboBox":
          baseType = "string";
          propertyDefinition.enum = column.comboBoxValues;
          break;

        case "nationalCode":
          baseType = "string";

          propertyDefinition.pattern = column.regex;
          break;

        case "phoneNumber":
          baseType = "string";

          propertyDefinition.pattern = column.regex;
          break;

        case "homeNumber":
          baseType = "string";

          propertyDefinition.pattern = column.regex;
          break;

        case "anyThings":
          baseType = "string";
          propertyDefinition.pattern = ".*";
          break;
      }

      propertyDefinition.type = column.nullable ? [baseType, "null"] : baseType;

      if (!column.nullable) {
        required.push(column.name);
      }

      properties[column.name] = propertyDefinition as JSONSchemaProperty;
    }

    return { $schema: "http://json-schema.org/draft-07/schema#", type: "object", properties, required, additionalProperties: false };
  }

  async isAncestor(ancestorId: number, descendantId: number, register: boolean) {
    if (ancestorId === descendantId) {
      return;
    }

    let descId = descendantId;

    if (!register) {
      const userLevel = await this.domain.db
        .selectFrom("user")
        .leftJoin("positions", "user.id", "user_id")
        .where("user.id", "=", descendantId)
        .select(["positions.id", "user_id"])
        .executeTakeFirst();

      if (userLevel === undefined) {
        throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
      }

      if (userLevel.id === null) {
        return;
      }

      descId = userLevel.id;
    }

    const ancestorData = await this.domain.db
      .withRecursive("ancestryChain", (qb) => qb

        .selectFrom("positions")
        .select(["id", "name", "parent"])
        .where("id", "=", descId)

        .unionAll(
          qb.selectFrom("positions")
            .innerJoin("ancestryChain", "ancestryChain.parent", "positions.id")
            .select(["positions.id", "positions.name", "positions.parent"])
        ))
      .selectFrom("ancestryChain")
      .where("id", "=", ancestorId)

      .select(["id", "name", "parent"])
      .executeTakeFirst();

    if (ancestorData === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }
  }

  async processAndSave(body: TCsvUpload, branchContext: BranchPayload): Promise<BulkInsertResponse> {
    try {
      const validator = await this._fetchAndCompileValidator(Number(body.tableId));
      const { unprocessableEntities, rows } = Validator._parseAndValidateCsv(body.file.file, validator);

      if (unprocessableEntities.length > 0) {
        return { success: false, errors: { troubled: unprocessableEntities } };
      }

      await this.domain.transaction(async (trx) => {
        const branchInfo = await trx.db.selectFrom("branch_user")
          .select("branch_id")
          .where("user_id", "=", branchContext.id)
          .executeTakeFirstOrThrow();

        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          const dataToInsert = chunk.map((row) => ({
            table_id: Number(body.tableId),
            branch: branchInfo.branch_id,
            data: JSON.stringify(row)
          }));

          if (dataToInsert.length > 0) {
            await trx.db.insertInto("table_data")
              .values(dataToInsert)
              .execute();
            await trx.db.updateTable("access_permissions")
              .set({ status: "sent" })
              .where("position_id", "=", branchContext.positionId)
              .where("table_serie_id", "=", Number(body.tableId))
              .executeTakeFirst();

            await trx.db.insertInto("table_log")
              .values({
                user_id: branchContext.id,
                branch_id: branchContext.positionId,
                table_id: Number(body.tableId)
              })
              .onDuplicateKeyUpdate(
                { user_id: branchContext.id }
              )
              .execute();
          }
        }
      });

      return { success: true, errors: { troubled: [] } };
    } catch (error) {
      if (error instanceof DomainException) {
        return {
          success: false,
          errors: { troubled: [{ index: 0, messages: [{ col: "file", error: `[${error.code}] ${error.message}` }] }] }
        };
      }

      throw error;
    }
  }

  private async _fetchAndCompileValidator(tableId: number): Promise<ValidateFunction> {
    const configResult = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_definition_id")
      .select("columns_properties")
      .where("table_series.id", "=", tableId)
      .executeTakeFirst();

    if (configResult === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, `CSV configuration for tableId ${tableId} not found.`);
    }

    const columnConfig: prop[] = configResult.columns_properties;

    const schema = Validator._generateSchema(columnConfig);

    return this.ajv.compile(schema);
  }
}
