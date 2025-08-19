import type { DomainManagerType } from "@/domain/index";
import type { BranchPayload, BulkInsertResponse } from "@/domain/types";
import type { TApproveTableBranch, TCsvUpload, TGetBranchTables } from "@/schema/vahed_schema";
import { DomainException } from "@/utils/errors";
import { CommonCodes } from "@/domain/errors";
import { formatCsvCell, hasRole } from "@/domain/helpers";
import type { TRetrieveBranchTable, TRetrieveTableProperty } from "@/schema/panel_schema";
import type { ColumnsProperty } from "@/domain/panel";

export class Vahed {
  constructor(domain: DomainManagerType) {
    this.domain = domain;
  }

  private readonly domain: DomainManagerType;

  async uploadBranchData(body: TCsvUpload, branchContext: BranchPayload): Promise<BulkInsertResponse> {
    const check = await this.domain.db.selectFrom("access_permissions")
      .innerJoin("table_series", "table_series.id", "access_permissions.table_serie_id")
      .selectAll()
      .where("position_id", "=", branchContext.positionId)
      .where("table_serie_id", "=", Number(body.tableId))
      .executeTakeFirst();

    if (check === undefined || check.approval_level !== 4) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    if ((check.status !== "notSent" && check.status !== "disapproved") || check.write_permission === 0) {
      throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
    }

    return this.domain.validator.processAndSave(body, branchContext);
  }

  async downloadTemplate(body: TRetrieveTableProperty, branchContext: BranchPayload) {
    const check = await this.domain.db.selectFrom("access_permissions")
      .selectAll()
      .where("position_id", "=", branchContext.positionId)
      .where("table_serie_id", "=", body.tableId)
      .executeTakeFirst();

    if (check === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    if (check.status !== "notSent" && check.status !== "disapproved") {
      throw new DomainException(CommonCodes.DuplicateEntryCode, "A file for this table has already been processed or is pending.");
    }

    const configResult = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_definition_id")
      .innerJoin("table_title", "table_title.id", "table_title_id")
      .select(["columns_properties", "table_title_FA"])
      .where("table_series.id", "=", body.tableId)
      .executeTakeFirst();

    if (configResult === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    const columnConfig = configResult.columns_properties;

    const columnNames = columnConfig.map((column) => column.name);

    const csvHeader = columnNames.map((name) => `"${name.replaceAll("\"", "\"\"")}"`).join(",");

    const fileBuffer = Buffer.from(csvHeader, "utf8");
    const fileSize = fileBuffer.length;

    const safeTableName = configResult.table_title_FA.replaceAll(/[^a-z0-9]/gi, "_");
    const fileName = `template_for_${safeTableName}.csv`;

    return {
      file: fileBuffer,
      size: fileSize,
      fileName: fileName
    };
  }

  async downloadBranchTable(body: TRetrieveBranchTable, branchContext: BranchPayload) {
    let checkAccess = this.domain.db.selectFrom("branches")
      .innerJoin("access_permissions", "access_permissions.position_id", "branches.id")
      .selectAll()
      .where("access_permissions.table_serie_id", "=", body.tableId)
      .where("status", "in", ["sent", "disapproved", "approved"]);
    let dataRows = this.domain.db.selectFrom("table_data")
      .select("data")
      .where("table_id", "=", body.tableId);

    if (branchContext.level === "supervisor") {
      if (body.branchId === undefined) {
        throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
      }

      const checkGroup = await this.domain.db.selectFrom("user")
        .innerJoin("group_user", "user_id", "user.id")
        .innerJoin("groups", "group_id", "groups.id")
        .innerJoin("branches", "groups.id", "branches.group")
        .selectAll()
        .where("user.id", "=", branchContext.id)
        .where("branches.id", "=", body.branchId)
        .executeTakeFirst();

      if (checkGroup === undefined) {
        throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
      }

      checkAccess = checkAccess.where("branches.id", "=", body.branchId);
      dataRows = dataRows.where("branch", "=", body.branchId);
    } else {
      dataRows = dataRows.where("branch", "=", branchContext.positionId);
      checkAccess = checkAccess.where("branches.id", "=", branchContext.positionId);
    }

    const accessCheck = await checkAccess.executeTakeFirst();

    if (accessCheck === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    const configResult = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_definition_id")
      .innerJoin("table_title", "table_title.id", "table_title_id")
      .select(["columns_properties", "table_title_FA"])
      .where("table_series.id", "=", body.tableId)
      .executeTakeFirst();

    if (configResult === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    const data = await dataRows
      .execute();

    const columnConfig = configResult.columns_properties;
    const columnNames = columnConfig.map((column) => column.name);
    const csvHeader = columnNames.map((element) => formatCsvCell(element)).join(",");

    const csvLines: string[] = [csvHeader];

    for (const dbRow of data) {
      const dataObject = dbRow.data as Record<string, unknown>;
      const values = columnNames.map((name) => {
        const value = dataObject[name];

        return formatCsvCell(value);
      });

      csvLines.push(values.join(","));
    }

    const finalCsvContent = csvLines.join("\n");

    const fileBuffer = Buffer.from(finalCsvContent, "utf8");
    const fileSize = fileBuffer.length;

    const safeTableName = configResult.table_title_FA.replaceAll(/[^a-z0-9]/gi, "_");
    const fileName = `data_for_${safeTableName}_branch_${body.branchId}.csv`;

    return {
      file: fileBuffer,
      size: fileSize,
      fileName: fileName
    };
  }

  async getBranchTables(entity: TGetBranchTables, adminContext: BranchPayload) {
    hasRole(adminContext, "user");

    let query = this.domain.db
      .selectFrom("table_series")
      .innerJoin("access_permissions", "table_series.id", "access_permissions.table_serie_id")
      .innerJoin("table_definition", "table_definition.id", "table_series.table_definition_id")
      .innerJoin("table_title", "table_title.id", "table_definition.table_title_id")
      .where("access_permissions.position_id", "=", adminContext.positionId)
      .where("access_permissions.permission", "=", "write")
      .where("table_series.approval_level", "=", 4);

    query = entity.active ? query.where("table_series.deadline", ">=", new Date(Date.now())) : query.where("table_series.deadline", "<", new Date(Date.now()));

    const totalItems = await query.select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow();
    const result = await query.clearSelect()
      .select([
        "table_series.id",
        "table_title.table_title_FA",
        "access_permissions.comment",
        "access_permissions.status",
        "table_series.change_lock",
        "table_series.deadline",
        "table_series.serial_number"
      ])
      .limit(20)
      .offset((entity.offset - 1) * 20)
      .execute();

    return {
      totalItems: totalItems.count.toString(),
      result
    };
  }

  async getGroupTables(entity: TGetBranchTables, adminContext: BranchPayload) {
    hasRole(adminContext, "supervisor");

    const branches = await this.domain.db.selectFrom("groups")
      .innerJoin("branches", "branches.group", "groups.id")
      .select("branches.id")
      .where("branches.group", "=", adminContext.positionId)
      .execute();
    let query = this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_series.table_definition_id")
      .innerJoin("table_title", "table_title.id", "table_definition.table_title_id")
      .innerJoin("access_permissions", "table_series.id", "access_permissions.table_serie_id")
      .innerJoin("table_log", "table_series.id", "table_log.table_id")
      .innerJoin("user", "user.id", "table_log.user_id")
      .innerJoin("branches", "access_permissions.position_id", "branches.id")
      .where("access_permissions.position_id", "in", branches.map((item) => item.id));

    query = entity.active ? query.where("table_series.deadline", ">=", new Date(Date.now())) : query.where("table_series.deadline", "<", new Date(Date.now()));
    const totalItems = await query.select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow();

    const result = await query
      .clearSelect()
      .select([
        "table_series.id",
        "table_series.serial_number",
        "branches.name",
        "branches.id as branchId",
        "access_permissions.status",
        "access_permissions.position_id as positionId",
        "table_title.table_title_FA",
        "table_series.deadline"
      ])
      .limit(20)
      .offset((entity.offset - 1) * 20)
      .execute();

    return {
      totalItems: totalItems.count.toString(),
      result
    };
  }

  async approveTableBranch(entity: TApproveTableBranch, adminContext: BranchPayload) {
    hasRole(adminContext, "supervisor");
    const check = await this.domain.db
      .selectFrom("user")
      .innerJoin("branch_user", "branch_user.user_id", "user.id")
      .innerJoin("branches", "branches.id", "branch_user.branch_id")
      .select("branches.group")
      .where("branches.id", "=", entity.branchId)
      .executeTakeFirstOrThrow();

    if (check.group !== adminContext.positionId) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    const data = await this.domain.db
      .selectFrom("access_permissions")
      .select("status")
      .where("table_serie_id", "=", entity.tableId)
      .where("position_id", "=", entity.branchId)
      .executeTakeFirstOrThrow();

    const property = await this.domain.db
      .selectFrom("table_series")
      .select("deadline")
      .where("id", "=", entity.tableId)
      .executeTakeFirstOrThrow();

    if (property.deadline < new Date(Date.now())) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    if (data.status !== "sent") {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    let query = this.domain.db
      .updateTable("access_permissions")
      .where("table_serie_id", "=", entity.tableId)
      .where("position_id", "=", entity.branchId);

    if (entity.action === "approve") {
      query = query.set({ status: "approved" });
    } else {
      if (entity.comment === undefined) {
        throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
      }

      query = query
        .set({ comment: entity.comment, status: "disapproved" });
    }

    await query.execute();
  }

  async viewBranchData(body: TRetrieveBranchTable, branchContext: BranchPayload) {
    hasRole(branchContext, "supervisor");

    if (body.branchId === undefined) {
      throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
    }

    const checkGroup = await this.domain.db.selectFrom("groups")
      .innerJoin("branches", "groups.id", "branches.group")
      .selectAll()
      .where("branches.group", "=", branchContext.positionId)
      .where("branches.id", "=", body.branchId)
      .executeTakeFirst();

    if (checkGroup === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    const checkAccess = await this.domain.db.selectFrom("branches")

      .innerJoin("access_permissions", "access_permissions.position_id", "branches.id")
      .selectAll()
      .where("branches.id", "=", body.branchId)
      .where("access_permissions.table_serie_id", "=", body.tableId)
      .where("status", "in", ["sent", "disapproved", "approved"])
      .executeTakeFirst();

    if (checkAccess === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    const result = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_series.table_definition_id")
      .innerJoin("table_title", "table_definition.table_title_id", "table_title.id")
      .select(["columns_properties", "table_title.table_title_FA", "deadline"])
      .where("table_series.id", "=", body.tableId)
      .executeTakeFirstOrThrow();

    const rawColumns = result.columns_properties as unknown as ColumnsProperty[];

    const metaData = {
      columns: rawColumns.map(({ regex, comboBoxValues, nullable, model, ...rest }) => {
        const toBeReplaced = ["anyThings", "phoneNumber", "homeNumber", "nationalCode", "comboBox"];

        return {
          ...rest,
          model: toBeReplaced.includes(model) ? "string" : model
        };
      }),
      name: result.table_title_FA,
      deadline: result.deadline
    };

    const rows = await this.domain.db
      .selectFrom("table_data")
      .innerJoin("branches", "branches.id", "table_data.branch")
      .innerJoin("branch_user", "branch_id", "branches.id")
      .innerJoin("groups", "groups.id", "branches.group")
      .innerJoin("branch_provinces", "branches.province", "branch_provinces.id")
      .select("data")
      .where("table_id", "=", body.tableId)
      .where("branches.id", "=", body.branchId)
      .execute();

    return { metaData, rows };
  }
}
