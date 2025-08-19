import { randomUUID } from "node:crypto";
import type { DomainManagerType } from "@/domain/index";
import type { AdminPayload } from "@/domain/types";
import { DomainException } from "@/utils/errors";
import { CommonCodes } from "@/domain/errors";
import type {
  TActivate,
  TApprove, TAssign,
  TChangePermission,
  TChangePersonalInfo,
  TChangeReadWritePermission,
  TEditTable,
  TExportTable,
  TGenerateTable,
  TGenerateTableTitles,
  TGetTableReaders,
  TRetrieveTableProperty,
  TReuseTable,
  TSearch,
  TSetWriteAccess
} from "@/schema/panel_schema";
import {
  formatCsvCell,
  hasPermission,
  hasRole,
  isMissingInNew,
  regexGenerator
} from "@/domain/helpers";

export interface ColumnsProperty {
  name: string;
  model: "comboBox" | "string" | "number" | "date";
  regex: string;
  comboBoxValues: [string];
  nullable: boolean;
}

export class Panel {
  constructor(domain: DomainManagerType) {
    this.domain = domain;
  }

  private readonly domain: DomainManagerType;

  async setWriteAccess(entity: TSetWriteAccess, adminContext: AdminPayload) {
    hasPermission(adminContext, "tablePermission");

    const data = await this.domain.db
      .selectFrom("table_series")
      .select("id")
      .where("id", "=", entity.table)
      .where((eb) => eb.or([
        eb("emp_position_id", "=", adminContext.positionId),
        eb("deputy_position_id", "=", adminContext.positionId),
        eb("manager_position_id", "=", adminContext.positionId),
        eb("boss_position_id", "=", adminContext.positionId)
      ]))
      .executeTakeFirst();

    const data2 = await this.domain.db
      .selectFrom("access_permissions")
      .select("id")
      .where("table_serie_id", "=", entity.table)
      .where("position_id", "=", adminContext.positionId)
      .where("permission", "in", ["read"])
      .executeTakeFirst();

    if (data === undefined && data2 === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    const userIds = entity.users.map((item) => item.id);

    if (userIds.length === 0) {
      await this.domain.db
        .deleteFrom("access_permissions")
        .where("table_serie_id", "=", entity.table)
        .execute();

      return;
    }

    const uniqueUserIds = entity.users.map((item) => item.id);
    const existingBranches = await this.domain.db
      .selectFrom("branches")
      .select("id")
      .where("id", "in", uniqueUserIds)
      .execute();

    if (existingBranches.length < entity.users.length) {
      const existingIds = new Set(existingBranches.map((b) => b.id));
      const missingIds = Array.from(uniqueUserIds).filter((id) => !existingIds.has(id));
      throw new DomainException(CommonCodes.NotFoundDataCode, `Invalid branch IDs provided: ${missingIds.join(", ")}`);
    }

    const tableLevel = await this.domain.db
      .selectFrom("table_series")
      .selectAll()
      .where("table_series.id", "=", entity.table)
      .executeTakeFirstOrThrow();

    if (tableLevel.approval_level !== 4) {
      throw new DomainException(CommonCodes.NotFinalizedTableCode, CommonCodes.NotFinalizedTableDesc);
    }

    const permissionsToInsert = entity.users.map((user) => ({
      table_serie_id: entity.table,
      position_id: user.id,
      permission: "write" as const,
      status: "notSent" as const
    }));
    await this.domain.transaction(async (domain) => {
      await domain.db
        .deleteFrom("access_permissions")
        .where("table_serie_id", "=", entity.table)
        .execute();
      await domain.db
        .insertInto("access_permissions")
        .values(permissionsToInsert)
        .execute();
    });
  }

  async changePersonalInfo(entity: TChangePersonalInfo, adminContext: AdminPayload) {
    hasPermission(adminContext, "userEditing");
    const user = await this.domain.db
      .selectFrom("user")
      .select(["id", "type"])
      .where("user.id", "=", entity.userId)
      .executeTakeFirst();

    if (user === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    if (user.type === "admin" && !adminContext.permissions.includes("superUserEditor")) {
      await this.domain.validator.isAncestor(adminContext.positionId, entity.userId, false);
    }

    const query = this.domain.db
      .updateTable("user")
      .set({
        first_name: entity.firstName,
        last_name: entity.lastName,
        mobileNumber: entity.mobileNumber,
        nationalCode: entity.nationalCode
      })
      .where("id", "=", entity.userId);

    await query.execute();
  }

  async checkPosition(adminContext: AdminPayload) {
    hasPermission(adminContext, "userEditing");
    let userLess;
    let notActiveUser;

    if (!adminContext.permissions.includes("superUserEditor")) {
      userLess = await this.domain.db
        .withRecursive("descendantChain", (qb) => qb
          .selectFrom("positions")
          .selectAll()
          .where("parent", "=", adminContext.positionId)
          .unionAll(
            qb.selectFrom("positions as p")
              .innerJoin("descendantChain as dc", "dc.id", "p.parent")
              .selectAll("p")
          ))
        .selectFrom("descendantChain")
        .select([
          "descendantChain.name as positionName",
          "descendantChain.level",
          "descendantChain.id as positionId"
        ])
        .where("user_id", "is", null)
        .execute();
      notActiveUser = await this.domain.db
        .withRecursive("descendantChain", (qb) => qb
          .selectFrom("positions")
          .selectAll()
          .where("parent", "=", adminContext.positionId)
          .unionAll(
            qb.selectFrom("positions as p")
              .innerJoin("descendantChain as dc", "dc.id", "p.parent")
              .selectAll("p")
          ))
        .selectFrom("descendantChain")
        .innerJoin("user", "descendantChain.user_id", "user.id")
        .select([
          "active",
          "descendantChain.name as positionName",
          "descendantChain.level",
          "descendantChain.id as positionId"
        ])
        .where("active", "=", false)
        .execute();
    } else {
      userLess = await this.domain.db
        .selectFrom("positions")
        .select(["positions.id as positionId", "positions.name as positionName", "positions.level"])
        .where("positions.user_id", "is", null)
        .execute();
      notActiveUser = await this.domain.db
        .selectFrom("positions")
        .leftJoin("user", "user.id", "positions.user_id")
        .select(["positions.id as positionId", "positions.name as positionName", "positions.level", "user.active"])
        .where("active", "=", false)
        .where("user.type", "=", "admin")
        .execute();
    }

    return [...userLess, ...notActiveUser];
  }

  async assign(entity: TAssign, adminContext: AdminPayload) {
    const user = await this.domain.db
      .selectFrom("user")
      .selectAll()
      .where("user.id", "=", entity.userId)
      .executeTakeFirst();

    if (user === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    if (entity.action === "position") {
      hasPermission(adminContext, "userEditing");

      if (!adminContext.permissions.includes("superUserEditor")) {
        await this.domain.validator.isAncestor(adminContext.positionId, entity.userId, false);
      }

      const position = await this.domain.db
        .selectFrom("positions")
        .leftJoin("user", "user.id", "positions.user_id")
        .selectAll()
        .where("positions.id", "=", entity.actionId)
        .executeTakeFirstOrThrow();

      if ((position.user_id !== null && position.active === true) || user.type !== "admin") {
        throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
      }

      const userHasPosition = await this.domain.db
        .selectFrom("positions")
        .selectAll()
        .where("user_id", "=", entity.userId)
        .execute();

      await this.domain.transaction(async (domain) => {
        if (userHasPosition.length > 0) {
          await domain.db.updateTable("positions")
            .set({ user_id: null })
            .where("user_id", "=", entity.userId)
            .execute();
        }

        await domain.db.updateTable("positions")
          .set({ user_id: entity.userId })
          .where("positions.id", "=", entity.actionId)
          .execute();
      });
    } else if (entity.action === "branch") {
      hasPermission(adminContext, "groupEditing");
      const branchUser = await this.domain.db
        .selectFrom("branches")
        .leftJoin("branch_user", "branches.id", "branch_user.branch_id")
        .leftJoin("user", "user.id", "branch_user.user_id")
        .selectAll()
        .where("branches.id", "=", entity.actionId)
        .executeTakeFirstOrThrow();

      if ((branchUser.user_id !== null && branchUser.active === true) || user.type !== "branchUser") {
        throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
      }

      const userHasBranch = await this.domain.db
        .selectFrom("branches")
        .leftJoin("branch_user", "branch_id", "branches.id")
        .selectAll()
        .where("user_id", "=", entity.userId)
        .execute();
      await this.domain.transaction(async (domain) => {
        if (branchUser.active === false) {
          await domain.db.deleteFrom("branch_user")
            .where("user_id", "=", branchUser.user_id)
            .execute();
        }

        if (userHasBranch.length > 0) {
          await domain.db.deleteFrom("branch_user")
            .where("user_id", "=", entity.userId)
            .execute();
        }

        await domain.db.insertInto("branch_user")
          .values({ user_id: entity.userId, branch_id: entity.actionId })
          .execute();
      });
    } else {
      hasPermission(adminContext, "groupEditing");
      const groupUser = await this.domain.db
        .selectFrom("groups")
        .leftJoin("group_user", "groups.id", "group_user.group_id")
        .leftJoin("user", "user.id", "group_user.user_id")
        .selectAll()
        .where("groups.id", "=", entity.actionId)
        .executeTakeFirstOrThrow();

      if ((groupUser.user_id !== null && groupUser.active === true) || user.type !== "groupUser") {
        throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
      }

      const userHasGroup = await this.domain.db
        .selectFrom("groups")
        .leftJoin("group_user", "group_id", "groups.id")
        .selectAll()
        .where("user_id", "=", entity.userId)
        .execute();
      await this.domain.transaction(async (domain) => {
        if (userHasGroup.length > 0) {
          await domain.db.deleteFrom("group_user")
            .where("user_id", "=", entity.userId)
            .execute();
        }

        if (groupUser.active === false) {
          await domain.db.deleteFrom("group_user")
            .where("user_id", "=", groupUser.user_id)
            .execute();
        }

        await domain.db.insertInto("group_user")
          .values({ user_id: entity.userId, group_id: entity.actionId })
          .execute();
      });
    }
  }

  async setReadAccess(entity: TChangeReadWritePermission, adminContext: AdminPayload) {
    hasPermission(adminContext, "tablePermission");

    const permissionCheck = await this.domain.db
      .selectFrom("positions")
      .leftJoin("access_permissions", (join) => join
        .onRef("positions.id", "=", "access_permissions.position_id")
        .on("access_permissions.table_serie_id", "=", entity.tableId))
      .where("positions.id", "=", entity.userId)
      .select(["access_permissions.id as accessID"])
      .executeTakeFirst();
    const tableLevel = await this.domain.db
      .selectFrom("table_series")
      .selectAll()
      .where("table_series.id", "=", entity.tableId)
      .executeTakeFirstOrThrow();

    if (tableLevel.approval_level !== 4) {
      throw new DomainException(CommonCodes.NotFinalizedTableCode, CommonCodes.NotFinalizedTableDesc);
    }

    if (permissionCheck === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, "User not found.");
    }

    if (entity.value === "add") {
      const { accessID } = permissionCheck;
      const hasExistingPermission = accessID !== null;

      if (hasExistingPermission) {
        throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
      }

      await this.domain.db
        .insertInto("access_permissions")
        .values({
          permission: "read",
          table_serie_id: entity.tableId,
          position_id: entity.userId
        })
        .execute();

      return;
    }

    await this.domain.db
      .deleteFrom("access_permissions")
      .where("position_id", "=", entity.userId)
      .where("table_serie_id", "=", entity.tableId)
      .execute();

    return;
  }

  async getTableReaders(entity: TGetTableReaders, _: AdminPayload) {
    const users = await this.domain.db
      .selectFrom("positions")
      .innerJoin("user", "positions.user_id", "user.id")
      .leftJoin("access_permissions", "access_permissions.position_id", "positions.id")
      .select([
        "user.id as userId",
        "positions.level",
        "first_name",
        "last_name",
        "access_permissions.permission",
        "access_permissions.table_serie_id"
      ])
      .execute();

    return users.filter((item) => (item.table_serie_id === entity.tableId && item.permission === "read"));
  }

  async activate(entity: TActivate, adminContext: AdminPayload) {
    hasPermission(adminContext, "userEditing");
    const user = await this.domain.db
      .selectFrom("user")
      .select("id")
      .where("user.id", "=", entity.userId)
      .executeTakeFirst();

    if (user === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    if (!adminContext.permissions.includes("superUserEditor")) {
      await this.domain.validator.isAncestor(adminContext.positionId, entity.userId, false);
    }

    if (entity.action === "activate") {
      await this.domain.db.updateTable("user")
        .set({ active: true })
        .where("user.id", "=", entity.userId)
        .execute();
    } else {
      await this.domain.db.updateTable("user")
        .set({ active: false })
        .where("user.id", "=", entity.userId)
        .execute();
    }
  }

  async changePermission(entity: TChangePermission, adminContext: AdminPayload) {
    hasPermission(adminContext, "userEditing");
    const { userId, permissions } = entity;
    const user = await this.domain.db
      .selectFrom("user")
      .innerJoin("positions", "positions.user_id", "user.id")
      .select(["user.id", "positions.level", "positions.id as positionId"])
      .where("user.id", "=", userId)
      .executeTakeFirst();

    if (user === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, "User not found.");
    }

    if (!adminContext.permissions.includes("superUserEditor")) {
      await this.domain.validator.isAncestor(adminContext.positionId, user.positionId, false);
    }

    const isRequestingTableCreate = permissions.some((p) => p.name === "tableCreate");

    if (user.level !== "expert" && isRequestingTableCreate) {
      throw new DomainException(
        CommonCodes.NoAccessCode,
        "Only users with 'expert' level can be assigned the 'tableCreate' permission."
      );
    }

    await this.domain.transaction(async (domain) => {
      await domain.db
        .deleteFrom("position_permission")
        .where("position_id", "=", user.positionId)
        .execute();

      if (permissions.length === 0) {
        return;
      }

      const permissionNames = permissions.map((p) => p.name);

      const permissionIds = await domain.db
        .selectFrom("permissions")
        .select("id")
        .where("name", "in", permissionNames)
        .execute();

      if (permissionIds.length === 0) {
        return;
      }

      const valuesToInsert = permissionIds.map((perm) => ({
        position_id: user.positionId,
        permission_id: perm.id
      }));

      await domain.db
        .insertInto("position_permission")
        .values(valuesToInsert)
        .execute();
    });
  }

  async search(entity: TSearch, adminContext: AdminPayload) {
    if (entity.action === "table") {
      let query = this.domain.db
        .selectFrom("table_series")
        .innerJoin("table_definition", "table_definition.id", "table_series.table_definition_id")
        .innerJoin("table_title", "table_definition.table_title_id", "table_title.id")
        .select([
          "table_series.id",
          "table_title.table_title_FA",
          "serial_number",
          "deadline",
          "table_definition_id",
          "table_title_id",
          "created",
          "creator",
          "modified"
        ]);

      if (!adminContext.permissions.includes("tablePermission")) {
        query = query.innerJoin("access_permissions", "access_permissions.table_serie_id", "table_series.id")
          .where("access_permissions.position_id", "=", adminContext.positionId)
          .where("access_permissions.permission", "in", ["read"]);
      }

      if (entity.name !== undefined) {
        query = query.where("table_title.table_title_FA", "like", `%${entity.name}%`);
      }

      return await query.execute();
    }

    hasPermission(adminContext, "userEditing");

    let branchUserQuery = this.domain.db
      .selectFrom("user")
      .innerJoin("branch_user", "branch_user.user_id", "user.id")
      .innerJoin("branches", "branches.id", "branch_user.branch_id")
      .leftJoin("groups", "groups.id", "branches.group")
      .select([
        "user.id as userId",
        "first_name",
        "last_name",
        "mobileNumber",
        "nationalCode",
        "active",
        "branches.name as branchName",
        "groups.name as groupName",
        "branches.id as branchId",
        "groups.id as groupId",
        "type"
      ]);

    let groupUserQuery = this.domain.db
      .selectFrom("user")
      .innerJoin("group_user", "group_user.user_id", "user.id")
      .innerJoin("groups", "groups.id", "group_user.group_id")
      .select([
        "user.id as userId",
        "first_name",
        "last_name",
        "mobileNumber",
        "nationalCode",
        "active",
        "groups.name as groupName",
        "groups.id as groupId",
        "type"
      ]);
    let adminUserQuery;

    if (!adminContext.permissions.includes("superUserEditor")) {
      adminUserQuery = this.domain.db
        .withRecursive("descendantChain", (qb) => qb
          .selectFrom("positions")
          .selectAll()
          .where("parent", "=", adminContext.positionId)
          .unionAll(
            qb.selectFrom("positions as p")
              .innerJoin("descendantChain as dc", "dc.id", "p.parent")
              .selectAll("p")
          ))
        .selectFrom("descendantChain")
        .innerJoin("user", "descendantChain.user_id", "user.id")
        .select([
          "user.id as userId",
          "first_name",
          "last_name",
          "mobileNumber",
          "nationalCode",
          "active",
          "descendantChain.name as positionName",
          "descendantChain.level",
          "descendantChain.id as positionId",
          "type"
        ])
        .$if(entity.name !== undefined, (qb) => qb.where("name", "like", `%${entity.name}%`));
    } else {
      adminUserQuery = this.domain.db
        .selectFrom("user")
        .innerJoin("positions", "positions.user_id", "user.id")
        .select([
          "user.id as userId",
          "first_name",
          "last_name",
          "mobileNumber",
          "nationalCode",
          "active",
          "positions.name as positionName",
          "positions.level",
          "positions.id as positionId",
          "type"
        ])
        .$if(entity.name !== undefined, (qb) => qb.where("name", "like", `%${entity.name}%`));
    }

    let unassignedUserQuery = this.domain.db
      .selectFrom("user")
      .leftJoin("branch_user", "branch_user.user_id", "user.id")
      .leftJoin("group_user", "group_user.user_id", "user.id")
      .leftJoin("positions", "positions.user_id", "user.id")
      .where("branch_user.user_id", "is", null)
      .where("group_user.user_id", "is", null)
      .where("positions.user_id", "is", null)
      .select(["user.id as userId", "nationalCode", "first_name", "last_name", "mobileNumber", "active", "type"]);

    if (entity.name !== undefined) {
      branchUserQuery = branchUserQuery.where("branches.name", "like", `%${entity.name}%`);
      groupUserQuery = groupUserQuery.where("groups.name", "like", `%${entity.name}%`);
      unassignedUserQuery = unassignedUserQuery.where("user.last_name", "like", `%${entity.name}%`);
    }

    const [branchUsers, groupUsers, adminUsers, unassignedUsers] = await Promise.all([
      branchUserQuery.execute(),
      groupUserQuery.execute(),
      adminUserQuery.execute(),
      unassignedUserQuery.execute()
    ]);

    return [...adminUsers, ...branchUsers, ...groupUsers, ...unassignedUsers];
  }

  async approve(entity: TApprove, adminContext: AdminPayload) {
    let data = this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_series.table_definition_id")
      .innerJoin("table_title", "table_definition.table_title_id", "table_title.id")
      .selectAll()
      .where("table_series.id", "=", entity.tableId);

    switch (adminContext.level) {
      case "boss": {
        data = data.where("boss_position_id", "=", adminContext.positionId);
        break;
      }

      case "deputy": {
        data = data.where("deputy_position_id", "=", adminContext.positionId);
        break;
      }

      case "manager": {
        data = data.where("manager_position_id", "=", adminContext.positionId);
        break;
      }

      case "expert": {
        data = data.where("emp_position_id", "=", adminContext.positionId);
        break;
      }

      case "user": {
        throw new Error("Not implemented yet: \"user\" case");
      }

      case "supervisor": {
        throw new Error("Not implemented yet: \"supervisor\" case");
      }
    }

    const table = await data.executeTakeFirst();

    if (table === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    if (table.approval_level !== table.previous_approval_level) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    const step = entity.func === "approve" ? 1 : -1;

    switch (adminContext.level) {
      case "boss": {
        if (table.approval_level !== 3) {
          throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
        }

        await this.domain.db
          .updateTable("table_series")
          .set({ approval_level: table.approval_level + step })
          .where("table_series.id", "=", entity.tableId)
          .execute();

        if (step === 1) {
          // await tableBuilder(table.table_title_FA);

          // todo write in new template
        }
        break;
      }

      case "deputy": {
        if (table.approval_level !== 2) {
          throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
        }

        await this.domain.db
          .updateTable("table_series")
          .set({ approval_level: table.approval_level + step })
          .where("table_series.id", "=", entity.tableId)
          .execute();
        break;
      }

      case "manager": {
        if (table.approval_level !== 1) {
          throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
        }

        await this.domain.db
          .updateTable("table_series")
          .set({ approval_level: table.approval_level + step })
          .where("table_series.id", "=", entity.tableId)
          .execute();
        break;
      }

      case "expert": {
        if (table.approval_level !== 0) {
          throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
        }

        if (step === -1) {
          throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
        }

        await this.domain.db
          .updateTable("table_series")
          .set({ approval_level: table.approval_level + step })
          .where("table_series.id", "=", entity.tableId)
          .execute();
        break;
      }
    }
  }

  async retrieveTableProperty(entity: TRetrieveTableProperty, adminContext: AdminPayload) {
    const access = await this.domain.db
      .selectFrom("access_permissions")
      .select("permission")
      .where("table_serie_id", "=", entity.tableId)
      .where("position_id", "=", adminContext.positionId)
      .executeTakeFirst();

    const flow = await this.domain.db
      .selectFrom("table_series")
      .selectAll()
      .where("id", "=", entity.tableId)
      .where((eb) => eb.or([
        eb("emp_position_id", "=", adminContext.positionId),
        eb("deputy_position_id", "=", adminContext.positionId),
        eb("manager_position_id", "=", adminContext.positionId),
        eb("boss_position_id", "=", adminContext.positionId)
      ]))
      .executeTakeFirst();

    if (access === undefined && flow === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    const result = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_series.table_definition_id")
      .innerJoin("table_title", "table_definition.table_title_id", "table_title.id")
      .select(["columns_properties", "table_title.table_title_FA", "deadline"])
      .where("table_series.id", "=", entity.tableId)
      .executeTakeFirstOrThrow();

    const rawColumns = result.columns_properties as unknown as ColumnsProperty[];

    return {
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
  }

  async retrieveTableData(entity: TRetrieveTableProperty, adminContext: AdminPayload) {
    const access = await this.domain.db
      .selectFrom("access_permissions")
      .select("permission")
      .where("table_serie_id", "=", entity.tableId)
      .where("position_id", "=", adminContext.positionId)
      .where("permission", "in", ["read"])
      .executeTakeFirst();
    const flow = await this.domain.db
      .selectFrom("table_series")
      .selectAll()
      .where("id", "=", entity.tableId)
      .where((eb) => eb.or([
        eb("emp_position_id", "=", adminContext.positionId),
        eb("deputy_position_id", "=", adminContext.positionId),
        eb("manager_position_id", "=", adminContext.positionId),
        eb("boss_position_id", "=", adminContext.positionId)
      ]))
      .executeTakeFirst();

    if (access === undefined && flow === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    // todo slice of data
    return await this.domain.db
      .selectFrom("table_data")
      .innerJoin("branches", "branches.id", "table_data.branch")
      .innerJoin("groups", "groups.id", "branches.group")
      .innerJoin("branch_provinces", "branches.province", "branch_provinces.id")
      .select(["data", "groups.name as groupName", "branches.name as branchName", "branch_provinces.name as provinceName"])
      .where("table_id", "=", entity.tableId)
      .where("branches.id", "in", this.domain.db.selectFrom("access_permissions")
        .select("position_id")
        .where("status", "=", "approved")
        .where("table_serie_id", "=", entity.tableId))
      .execute();
  }

  async retrieveTableSetting(entity: TRetrieveTableProperty, adminContext: AdminPayload) {
    const data = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition_id", "table_definition.id")
      .innerJoin("table_title", "table_definition.table_title_id", "table_title.id")
      .select([
        "columns_properties",
        "table_title.table_title_FA",
        "deadline",
        "serial_number",
        "approval_level",
        "previous_approval_level",
        "write_permission",
        "change_lock",
        "table_series.id as serie_id",
        "table_definition_id as definition_id"
      ])
      .where("table_series.id", "=", entity.tableId)
      .where((eb) => eb.or([
        eb("emp_position_id", "=", adminContext.positionId),
        eb("deputy_position_id", "=", adminContext.positionId),
        eb("manager_position_id", "=", adminContext.positionId),
        eb("boss_position_id", "=", adminContext.positionId)
      ]))
      .executeTakeFirst();

    if (data === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    let status;

    if (data.approval_level === data.previous_approval_level) {
      status = "Under review";
    } else if (data.approval_level > data.previous_approval_level) {
      status = "Approved";
    } else {
      status = "Rejected";
    }

    const query = this.domain.db
      .updateTable("table_series")
      .set({ previous_approval_level: data.approval_level })
      .where("table_series.id", "=", data.serie_id);

    switch (adminContext.level) {
      case "boss": {
        if ((data.approval_level === 3 && data.previous_approval_level === 2)) {
          await query.execute();
        }
        break;
      }

      case "deputy": {
        if ((data.approval_level === 2 && data.previous_approval_level === 1)
          || (data.approval_level === 2 && data.previous_approval_level === 3)) {
          await query.execute();
        }
        break;
      }

      case "manager": {
        if ((data.approval_level === 1 && data.previous_approval_level === 0)
          || (data.approval_level === 1 && data.previous_approval_level === 2)) {
          await query.execute();
        }
        break;
      }

      case "expert": {
        if ((data.approval_level === 0 && data.previous_approval_level === 1)) {
          await query.execute();
        }
        break;
      }

      case "user": {
        throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
      }

      case "supervisor": {
        throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
      }
    }

    return {
      ...data, status
    };
  }

  async createTable(entity: TGenerateTable, adminContext: AdminPayload) {
    const check = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition.id", "table_series.table_definition_id")
      .innerJoin("table_title", "table_definition.table_title_id", "table_title.id")
      .select(["table_title_id", "table_series.id as serieId", "table_definition.id as definitionId", "approval_level", "old"])
      .where("table_title_FA", "=", entity.tableName)
      .executeTakeFirst();

    // todo check role
    hasPermission(adminContext, "tableCreate");
    hasRole(adminContext, "expert");

    if (check !== undefined) {
      throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
    }

    const serial = randomUUID()
      .toLowerCase()
      .replaceAll("-", "");

    const { expertId, managerId, deputyId, bossId } = await this.domain.db
      .selectFrom("positions as expert_pos")
      .leftJoin("positions as manager_pos", "manager_pos.id", "expert_pos.parent")
      .leftJoin("positions as deputy_pos", "deputy_pos.id", "manager_pos.parent")
      .leftJoin("positions as boss_pos", "boss_pos.id", "deputy_pos.parent")
      .where("expert_pos.id", "=", adminContext.positionId)
      .select([
        "expert_pos.id as expertId",
        "manager_pos.id as managerId",
        "deputy_pos.id as deputyId",
        "boss_pos.id as bossId"
      ])
      .executeTakeFirstOrThrow();

    const cleanedItems = entity.fields.map((data) => ({
      ...data,
      regex: ""
    }));

    for (const item of cleanedItems) {
      item.regex = regexGenerator(item);
      item.comboBoxValues ??= [];
    }

    await this.domain.transaction(async (domain) => {
      const titleId = await domain.db.insertInto("table_title")
        .values({ table_title_FA: entity.tableName })
        .executeTakeFirst();

      if (titleId.insertId === undefined) {
        throw new Error("Group insertion did not return an ID.");
      }

      const tableTitleIdAsNumber = Number(titleId.insertId);

      const id = await domain.db.insertInto("table_definition")
        .values({
          table_title_id: tableTitleIdAsNumber,
          columns_properties: JSON.stringify(cleanedItems),
          old: JSON.stringify(cleanedItems)
        })
        .executeTakeFirst();

      if (id.insertId === undefined) {
        throw new Error("Group insertion did not return an ID.");
      }

      if (managerId === null || deputyId === null || bossId === null) {
        throw new DomainException(CommonCodes.FlowDefectCode, CommonCodes.FlowDefectDesc);
      }

      const tableDefinitionIdAsNumber = Number(id.insertId);
      await domain.db
        .insertInto("table_series")
        .values({
          approval_level: 0,
          previous_approval_level: 0,
          boss_position_id: bossId as unknown as number,
          manager_position_id: managerId,
          deputy_position_id: deputyId as unknown as number,
          emp_position_id: expertId,
          creator: adminContext.id,
          deadline: new Date(entity.deadline),
          change_lock: 1,
          write_permission: 1,
          serial_number: serial,
          table_definition_id: tableDefinitionIdAsNumber
        })
        .execute();
    });

    return;
  }

  async reuseTable(entity: TReuseTable, adminContext: AdminPayload) {
    // todo check role
    hasPermission(adminContext, "tableCreate");
    hasRole(adminContext, "expert");

    const check = await this.domain.db
      .selectFrom("table_definition")
      .select(["table_title_id", "id", "table_definition.columns_properties"])
      .where("id", "=", entity.definitionId)
      .executeTakeFirst();

    const checkActiveTables = await this.domain.db
      .selectFrom("table_series")
      .select(["table_definition_id", "approval_level"])
      .where("table_definition_id", "=", entity.definitionId)
      .execute();

    if (checkActiveTables.some((branch) => branch.approval_level !== 4)) {
      throw new DomainException(CommonCodes.ActiveEntryExistCode, CommonCodes.ActiveEntryExistDesc);
    }

    if (check === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    const serial = randomUUID()
      .toLowerCase()
      .replaceAll("-", "");

    const { expertId, managerId, deputyId, bossId } = await this.domain.db
      .selectFrom("positions as expert_pos")
      .leftJoin("positions as manager_pos", "manager_pos.id", "expert_pos.parent")
      .leftJoin("positions as deputy_pos", "deputy_pos.id", "manager_pos.parent")
      .leftJoin("positions as boss_pos", "boss_pos.id", "deputy_pos.parent")
      .where("expert_pos.id", "=", adminContext.positionId)
      .select([
        "expert_pos.id as expertId",
        "manager_pos.id as managerId",
        "deputy_pos.id as deputyId",
        "boss_pos.id as bossId"
      ])
      .executeTakeFirstOrThrow();

    const cleanedItems = entity.fields.map((data) => ({
      ...data,
      regex: ""
    }));

    for (const item of cleanedItems) {
      item.regex = regexGenerator(item);
      item.comboBoxValues ??= [];
    }

    cleanedItems.push(...check.columns_properties);

    if (managerId === null || deputyId === null || bossId === null) {
      throw new DomainException(CommonCodes.FlowDefectCode, CommonCodes.FlowDefectDesc);
    }

    await this.domain.transaction(async (domain) => {
      await domain.db.updateTable("table_definition")
        .set({ columns_properties: JSON.stringify(cleanedItems) })
        .where("table_definition.id", "=", entity.definitionId)
        .execute();
      await domain.db
        .insertInto("table_series")
        .values({
          previous_approval_level: 0,
          approval_level: 0,
          boss_position_id: bossId as unknown as number,
          manager_position_id: managerId,
          deputy_position_id: deputyId as unknown as number,
          emp_position_id: expertId,
          creator: adminContext.id,
          deadline: new Date(entity.deadline),
          table_definition_id: entity.definitionId,
          change_lock: 1,
          write_permission: 1,
          serial_number: serial
        })
        .execute();
    });

    return;
  }

  async editTable(entity: TEditTable, adminContext: AdminPayload) {
    // todo check role
    hasPermission(adminContext, "tableCreate");
    hasRole(adminContext, "expert");

    const existance = await this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_definition_id", "table_definition.id")
      .innerJoin("table_title", "table_title_id", "table_title.id")
      .select(["table_definition.id", "table_title.id as titleID", "approval_level", "table_definition.columns_properties", "table_definition.old", "table_title_FA"])
      .where("table_series.id", "=", entity.serieId)
      .executeTakeFirst();

    if (existance === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    const titleSeries = await this.domain.db
      .selectFrom("table_series")
      .select("id")
      .where("table_definition_id", "=", existance.id)
      .execute();

    if (existance.approval_level !== 0) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    let editType: "reuse" | "create" = "create";

    if (titleSeries.length > 1) {
      editType = "reuse";
    }

    const cleanedItems = entity.fields.map((data) => ({
      ...data,
      regex: ""
    }));

    for (const item of cleanedItems) {
      item.regex = regexGenerator(item);

      item.comboBoxValues ??= [];
    }

    if (editType === "reuse") {
      if (entity.tableName !== undefined) {
        throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
      }

      isMissingInNew(existance.old, cleanedItems);

      await this.domain.transaction(async (domain) => {
        await domain.db.updateTable("table_definition")
          .set({ columns_properties: JSON.stringify(cleanedItems) })
          .where("table_definition.id", "=", existance.id)
          .executeTakeFirst();
        await domain.db
          .updateTable("table_series")
          .set({ deadline: new Date(entity.deadline) })
          .where("table_series.id", "=", entity.serieId)
          .execute();
      });
    } else {
      await this.domain.transaction(async (domain) => {
        if (entity.tableName !== undefined) {
          const name = await this.domain.db
            .selectFrom("table_title")
            .select("table_title_FA")
            .where("table_title_FA", "=", entity.tableName)
            .executeTakeFirst();

          if (name !== undefined) {
            throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
          }

          const titleId = await domain.db.insertInto("table_title")
            .values({ table_title_FA: entity.tableName })
            .executeTakeFirst();

          if (titleId.insertId === undefined) {
            throw new Error("Group insertion did not return an ID.");
          }

          const tableTitleIdAsNumber = Number(titleId.insertId);
          await domain.db.updateTable("table_definition")
            .set({ table_title_id: tableTitleIdAsNumber })
            .where("table_definition.id", "=", existance.id)
            .execute();

          await domain.db.deleteFrom("table_title")
            .where("table_title.id", "=", existance.titleID)
            .execute();
        }

        await domain.db.updateTable("table_definition")
          .set({
            old: JSON.stringify(cleanedItems),
            columns_properties: JSON.stringify(cleanedItems)
          })
          .where("table_definition.id", "=", existance.id)
          .execute();
        await domain.db.updateTable("table_series")
          .set({ deadline: new Date(entity.deadline) })
          .where("table_series.id", "=", entity.serieId)
          .execute();
      });
    }
  }

  async getTableTitles(entity: TGenerateTableTitles, adminContext: AdminPayload) {
    hasPermission(adminContext, "tableCreate");
    const name = await this.domain.db
      .selectFrom("table_title")
      .select("table_title_FA")
      .where("table_title_FA", "=", entity.tableName)
      .executeTakeFirst();

    if (name !== undefined) {
      throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
    }
  }

  async exportTable(body: TExportTable, adminContext: AdminPayload) {
    const access = await this.domain.db
      .selectFrom("access_permissions")
      .select("permission")
      .where("table_serie_id", "=", body.tableId)
      .where("position_id", "=", adminContext.positionId)
      .where("permission", "in", ["read"])
      .executeTakeFirst();
    const flow = await this.domain.db
      .selectFrom("table_series")
      .selectAll()
      .where("id", "=", body.tableId)
      .where((eb) => eb.or([
        eb("emp_position_id", "=", adminContext.positionId),
        eb("deputy_position_id", "=", adminContext.positionId),
        eb("manager_position_id", "=", adminContext.positionId),
        eb("boss_position_id", "=", adminContext.positionId)
      ]))
      .executeTakeFirst();

    if (access === undefined && flow === undefined) {
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

    const dataRows = await this.domain.db.selectFrom("table_data")
      .select("data")
      .where("table_id", "=", body.tableId)
      .execute();

    const columnConfig = configResult.columns_properties;
    const columnNames = columnConfig.map((column) => column.name);
    const csvHeader = columnNames.map((element) => formatCsvCell(element)).join(",");

    const csvLines: string[] = [csvHeader];

    for (const dbRow of dataRows) {
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
    const fileName = `data_for_${safeTableName}.csv`;

    return {
      file: fileBuffer,
      size: fileSize,
      fileName: fileName
    };
  }
}
