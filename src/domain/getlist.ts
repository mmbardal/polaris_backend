import type { DomainManagerType } from "@/domain/index";
import type {
  TCheck,
  TCreateGroup,
  TDeleteGroup,
  TEditGroup,
  TGetGroupBranhces,
  TGetTable,
  TGetTableTitles,
  TGetUser,
  TGetWriteAccess
} from "@/schema/getList";
import type { AdminPayload } from "@/domain/types";
import { getMyAction, hasPermission } from "@/domain/helpers";
import { DomainException } from "@/utils/errors";
import { CommonCodes } from "@/domain/errors";

export class GetList {
  constructor(domain: DomainManagerType) {
    this.domain = domain;
  }

  private readonly domain: DomainManagerType;

  async getTable(entity: TGetTable, adminContext: AdminPayload) {
    let query = this.domain.db
      .selectFrom("table_series")
      .innerJoin("table_definition", "table_series.table_definition_id", "table_definition.id")
      .innerJoin("table_title", "table_definition.table_title_id", "table_title.id")
      .innerJoin("user", "user.id", "table_series.creator");

    switch (adminContext.level) {
      case "boss": {
        break;
      }

      case "deputy": {
        query = query
          .where("deputy_position_id", "=", adminContext.positionId);
        break;
      }

      case "manager": {
        query = query
          .where("manager_position_id", "=", adminContext.positionId);
        break;
      }

      case "expert": {
        query = query
          .where("emp_position_id", "=", adminContext.positionId);
        break;
      }

      case "user": {
        throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
      }

      case "supervisor": {
        throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
      }
    }

    query = query
      .where("write_permission", "=", Number(entity.active));

    if (entity.tableName !== undefined) {
      query = query.where("table_title_FA", "like", `${entity.tableName}%`);
    }

    if (entity.deadline !== undefined) {
      query = query.where("table_series.deadline", ">=", new Date(entity.deadline));
    }

    const totalItems = await query.select(({ fn }) => fn.countAll().as("count"))
      .executeTakeFirstOrThrow();
    const data = await query.clearSelect().select([
      "table_series.id as serie_id",
      "table_definition.id as definition_id",
      "table_title_id as title_id",
      "write_permission",
      "change_lock",
      "deadline",
      "approval_level",
      "previous_approval_level",
      "serial_number",
      "table_title_FA",
      "table_series.created",
      "table_series.modified",
      "user.first_name",
      "user.last_name"
    ])
      .orderBy("serie_id", "desc")
      .limit(20)
      .offset((entity.offset - 1) * 20)
      .execute();

    const result = data.map((table) => {
      let status: string;
      const myAction = getMyAction(table.approval_level, adminContext).myAction;

      if (table.approval_level === table.previous_approval_level) {
        status = "Under review";
      } else if (table.approval_level > table.previous_approval_level) {
        status = "Approved";
      } else {
        status = "Rejected";
      }

      // Return new object with status and without previous_approval_level
      const { previous_approval_level, ...rest } = table;

      return { ...rest, status, myAction };
    });

    return { totalItems: totalItems.count.toString(), result };
  }

  async getTableTitles(entity: TGetTableTitles) {
    const query = this.domain.db
      .selectFrom("table_title")
      .select(({ fn }) => fn.countAll().as("count"));

    const totalItems = await query.executeTakeFirstOrThrow();

    const result = await query
      .clearSelect()
      .selectAll()
      .orderBy("id", "desc")
      .limit(20)
      .offset((entity.offset - 1) * 20)
      .execute();

    return { totalItems: totalItems.count.toString(), result };
  }

  async getUser(entity: TGetUser, adminContext: AdminPayload) {
    hasPermission(adminContext, "userEditing");

    if (!adminContext.permissions.includes("superUserEditor")) {
      await this.domain.validator.isAncestor(adminContext.positionId, entity.Id, false);
    }

    const user = await this.domain.db
      .selectFrom("user")
      .innerJoin("positions", "user_id", "user.id")
      .select([
        "user_id as id",
        "positions.id as positionId",
        "positions.name as positionName",
        "first_name",
        "last_name",
        "active",
        "mobileNumber",
        "level"
      ])
      .where("user.id", "=", entity.Id)
      .executeTakeFirst();

    if (user === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    const permission = await this.domain.db
      .selectFrom("position_permission")
      .innerJoin("permissions", "permissions.id", "permission_id")
      .select("name")
      .where("position_id", "=", user.positionId)
      .execute();
    const permissions: string[] = [];

    for (const item of permission) {
      if (item.name === "superUserEditor") {
        continue;
      }

      permissions.push(item.name);
    }

    return { ...user, permissions };
  }

  async getBranches(entity: TGetGroupBranhces) {
    let query = this.domain.db
      .selectFrom("branch_provinces")
      .innerJoin("branches", "branch_provinces.id", "branches.province")
      .leftJoin("groups", "branches.group", "groups.id")
      .leftJoin("branch_user", "branches.id", "branch_user.branch_id")
      .leftJoin("user", "user.id", "branch_user.user_id")
      .select(["user.id as userId", "branches.id as branchId", "branches.name as branchName", "college", "branch_provinces.name as provinceName", "groups.name as groupName", "groups.id as groupId"]);

    if (entity.groupId !== undefined) {
      query = query.where("branches.group", "=", entity.groupId);
    }

    if (entity.branchName !== undefined) {
      query = query.where("branches.name", "like", `%${entity.branchName}%`);
    }

    return await query.execute();
  }

  async getGroups() {
    return this.domain.db
      .selectFrom("groups")
      .leftJoin("group_user", "group_id", "groups.id")
      .leftJoin("user", "user.id", "group_user.user_id")
      .select(["groups.id as groupId", "groups.name as groupName", "user.first_name", "user.last_name", "user.id as userId"])
      .execute();
  }

  async TableRecipientStatus(entity: TGetWriteAccess, adminContext: AdminPayload) {
    const data = await this.domain.db
      .selectFrom("table_series")
      .select("id")
      .where("id", "=", entity.tableId)
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
      .where("table_serie_id", "=", entity.tableId)
      .where("position_id", "=", adminContext.positionId)
      .where("permission", "in", ["read"])
      .executeTakeFirst();

    if (data === undefined && data2 === undefined) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    return await this.domain.db
      .selectFrom("branches")
      .innerJoin("access_permissions", "access_permissions.position_id", "branches.id")
      .leftJoin("table_log", "branches.id", "table_log.branch_id")
      .leftJoin("user", "user.id", "table_log.user_id")
      .innerJoin("branch_provinces", "branch_provinces.id", "branches.province")
      .innerJoin("groups", "groups.id", "branches.group")
      .select((eb) => [
        "user.id as userID",
        "first_name",
        "branches.id as branchId",
        "last_name",
        "access_permissions.status",
        "branches.name as branchName",
        "groups.name as groupName",
        "branch_provinces.name as provinceName",
        "send_time as statusChangeDate",
        eb.selectFrom("table_data")
          .select("updated_at")
          .whereRef("table_data.branch", "=", "branches.id")
          .limit(1)
          .as("submissionDate")
      ])
      .where("access_permissions.table_serie_id", "=", entity.tableId)
      .where("branches.id", "is not", null)
      .orderBy("access_permissions.position_id", "desc")
      .execute();
  }

  async getAdminSubGroup(adminContext: AdminPayload) {
    if (adminContext.level === "expert") {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    return await this.domain.db
      .selectFrom("user")
      .innerJoin("positions", "user_id", "user.id")
      .select([
        "user_id as id",
        "positions.id as positionId",
        "positions.name as positionName",
        "first_name",
        "last_name",
        "active",
        "mobileNumber",
        "level",
        "nationalCode",
        "parent"
      ])
      .where("parent", "=", adminContext.id)
      .execute();
  }

  async createGroup(entity: TCreateGroup, adminContext: AdminPayload) {
    hasPermission(adminContext, "groupEditing");
    const group = await this.domain.db
      .selectFrom("groups")
      .select("name")
      .where("name", "=", entity.name)
      .executeTakeFirst();

    if (group !== undefined) {
      throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
    }

    if (entity.branches !== undefined) {
      const branches = await this.domain.db
        .selectFrom("branches")
        .select("name")
        .where("branches.group", "is not", null)
        .where("branches.id", "in", entity.branches)
        .execute();

      if (branches.length > 0) {
        throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
      }
    }

    await this.domain.transaction(async (domain) => {
      const id = await domain.db.insertInto("groups")
        .values({ name: entity.name })
        .executeTakeFirst();

      if (id.insertId === undefined) {
        throw new Error("Group insertion did not return an ID.");
      }

      const groupIdAsNumber = Number(id.insertId);

      if (entity.branches !== undefined) {
        await domain.db
          .updateTable("branches")
          .set({
            group: groupIdAsNumber
          })
          .where("branches.id", "in", entity.branches)
          .execute();
      }
    });
  }

  async editGroup(entity: TEditGroup, adminContext: AdminPayload) {
    hasPermission(adminContext, "groupEditing");
    const group = await this.domain.db
      .selectFrom("groups")
      .select("name")
      .where("name", "=", entity.name)
      .where("groups.id", "!=", entity.id)
      .executeTakeFirst();

    if (group !== undefined) {
      throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
    }

    if (entity.branches !== undefined && entity.branches.length > 0) {
      const branches = await this.domain.db
        .selectFrom("branches")
        .selectAll()
        .where("branches.group", "!=", entity.id)
        .where("branches.id", "in", entity.branches)
        .execute();

      const hasNonNullGroup = branches.some((branch) => branch.group !== null);

      if (hasNonNullGroup) {
        throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
      }
    }

    await this.domain.transaction(async (domain) => {
      await domain.db.updateTable("groups")
        .set({ name: entity.name })
        .where("id", "=", entity.id)
        .execute();

      if (entity.branches !== undefined) {
        await domain.db
          .updateTable("branches")
          .set({ group: null })
          .where("group", "=", entity.id)
          .execute();

        if (entity.branches.length > 0) {
          await domain.db
            .updateTable("branches")
            .set({
              group: entity.id
            })
            .where("branches.id", "in", entity.branches)
            .execute();
        }
      }
    });
  }

  async deleteGroup(entity: TDeleteGroup, adminContext: AdminPayload) {
    hasPermission(adminContext, "groupEditing");
    const group = await this.domain.db
      .selectFrom("groups")
      .innerJoin("group_user", "group_id", "groups.id")
      .innerJoin("user", "group_user.user_id", "user.id")
      .select(["groups.name", "user.active"])
      .where("groups.id", "=", entity.id)
      .executeTakeFirst();

    if (group !== undefined && group.active) {
      throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
    }

    await this.domain.transaction(async (domain) => {
      await domain.db.updateTable("branches")
        .set({ group: null })
        .where("group", "=", entity.id)
        .execute();
      await domain.db.deleteFrom("group_user")
        .where("group_user.group_id", "=", entity.id)
        .execute();
      await domain.db.deleteFrom("groups")
        .where("id", "=", entity.id)
        .execute();
    });
  }

  async check(entity: TCheck, adminContext: AdminPayload) {
    hasPermission(adminContext, "groupEditing");
    let userLess = [];
    let notActiveUser = [];

    if (entity.checkType === "branchHasGroup") {
      return await this.domain.db
        .selectFrom("branches")
        .leftJoin("groups", "branches.group", "groups.id")
        .select(["branches.id as branchId", "branches.name as branchName", "groups.id as groupId"])
        .where("branches.group", "is", null)
        .execute();
    } else if (entity.checkType === "branchHasUser") {
      userLess = await this.domain.db
        .selectFrom("branches")
        .leftJoin("branch_user", "branches.id", "branch_user.branch_id")
        .select(["branches.id as branchId", "branches.name as branchName", "branch_user.user_id as userId"])
        .where("branch_user.user_id", "is", null)
        .execute();
      notActiveUser = await this.domain.db
        .selectFrom("branches")
        .leftJoin("branch_user", "branches.id", "branch_user.branch_id")
        .leftJoin("user", "user.id", "branch_user.user_id")
        .select(["branches.id as branchId", "branches.name as branchName", "branch_user.user_id as userId", "user.active"])
        .where("user.active", "=", false)
        .where("user.type", "=", "branchUser")
        .execute();

      return [...userLess, ...notActiveUser];
    } else {
      userLess = await this.domain.db
        .selectFrom("groups")
        .leftJoin("group_user", "groups.id", "group_user.group_id")
        .select(["groups.id as groupId", "groups.name as groupName", "group_user.user_id as userId"])
        .where("group_user.user_id", "is", null)
        .execute();
      notActiveUser = await this.domain.db
        .selectFrom("groups")
        .leftJoin("group_user", "groups.id", "group_user.group_id")
        .leftJoin("user", "user.id", "group_user.user_id")
        .select(["groups.id as groupId", "groups.name as groupName", "group_user.user_id as userId", "user.active"])
        .where("user.active", "=", false)
        .where("user.type", "=", "groupUser")
        .execute();

      return [...userLess, ...notActiveUser];
    }
  }
}
