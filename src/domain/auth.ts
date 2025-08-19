import { format } from "node:util";
import { NAPISkiaCaptcha } from "@paratco/captcha/napi-skia";
import {
  captchaExpireTime,
  captchaPrivateKey,
  captchaPublicKey,
  isProduction,
  otpExpirationSeconds, selfUrl
} from "@/env_values";
import type {
  TLogin,
  TLoginOtp,
  TRegisterAdmin,
  TRegisterUser
} from "@/schema/auth";
import { DomainException } from "@/utils/errors";
import { CommonCodes, UserErrorCodes } from "@/domain/errors";
import type { DomainManagerType } from "@/domain/index";
import type { AdminPayload } from "@/domain/types";
import { generateRandomNumber, hasPermission } from "@/domain/helpers";
import { Redis } from "@/data/redis";
import { SMS } from "@/service/sms";

const hostName = new URL(selfUrl).host;

const OTPString = `سامانه دانش آموختگان دانشگاه آزاد
رمز یکبار مصرف: %s

از در اختیار قراردادن محتویات این پیامک به دیگران خوداری نمایید.

@${hostName} #%s`;

interface OTPCache {
  tries: number;
  OTP: string;
  role: "boss" | "deputy" | "expert" | "manager" | "supervisor" | "user";
}

export class Auth {
  constructor(domain: DomainManagerType) {
    this.customCaptcha = new NAPISkiaCaptcha({
      privateKey: captchaPrivateKey,
      publicKey: captchaPublicKey,
      domain: "tuition-user",
      width: 123,
      height: 54,
      length: 5,
      rotateDegree: 30
    });
    this.domain = domain;
  }

  private readonly customCaptcha: NAPISkiaCaptcha;
  private readonly domain: DomainManagerType;
  private readonly loginOtpCacheKeyPrefix: string = "login_otp_";

  async captcha() {
    return this.customCaptcha.generate();
  }

  async login(entity: TLogin) {
    if (isProduction
      && !this.customCaptcha.verify({
        n: entity.n, t: entity.t, s: entity.s, value: entity.value
      }, captchaExpireTime)) {
      throw new DomainException(CommonCodes.BadCaptchaCode, CommonCodes.BadCaptchaDesc);
    }

    const user = await this.domain.db
      .selectFrom("user")
      .leftJoin("positions", "positions.user_id", "user.id")
      .leftJoin("branch_user", "branch_user.user_id", "user.id")
      .leftJoin("group_user", "group_user.user_id", "user.id")
      .selectAll()
      .where("mobileNumber", "=", entity.mobileNumber)
      .where("nationalCode", "=", entity.nationalCode)
      .executeTakeFirst();

    if (user === undefined) {
      throw new DomainException(UserErrorCodes.WrongUsernamePasswordCode, UserErrorCodes.WrongUsernamePasswordDesc);
    }

    if (!user.active) {
      throw new DomainException(UserErrorCodes.DisableUserCode, UserErrorCodes.DisableUserDesc);
    }

    const cacheKey = this.loginOtpCacheKeyPrefix + entity.mobileNumber;

    if (await Redis.instance.exists(cacheKey)) {
      throw new DomainException(CommonCodes.OtpExistsCode, CommonCodes.OtpExistsDesc);
    }

    const OTP = (isProduction ? generateRandomNumber(6) : "123456").toString();
    let otp: OTPCache;

    if (user.type === "admin" && user.level !== null) {
      otp = { OTP, tries: 0, role: user.level };
    } else if (user.type === "branchUser") {
      otp = { OTP, tries: 0, role: "user" };
    } else {
      otp = { OTP, tries: 0, role: "supervisor" };
    }

    await Redis.instance.set(cacheKey, otp, { expiration: { type: "EX", value: otpExpirationSeconds } });
    await SMS.instance.send(entity.mobileNumber, format(OTPString, OTP));

    return;
  }

  async loginOTP(entity: TLoginOtp) {
    const cacheKey = this.loginOtpCacheKeyPrefix + entity.mobileNumber;
    const otp = await Redis.instance.get<OTPCache>(cacheKey);

    if (otp !== null) {
      if (otp.OTP !== entity.otp) {
        otp.tries += 1;

        if (otp.tries === 4) {
          await Redis.instance.delete(cacheKey);
          throw new DomainException(CommonCodes.WrongOtpCode, CommonCodes.WrongOtpDesc);
        }

        await Redis.instance.set(cacheKey, otp, { expiration: "KEEPTTL" });
        throw new DomainException(CommonCodes.WrongOtpCode, CommonCodes.WrongOtpDesc);
      }
    } else {
      throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
    }

    if (otp.role !== "user" && otp.role !== "supervisor") {
      const data = await this.domain.db
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
        .where("mobileNumber", "=", entity.mobileNumber)
        .executeTakeFirstOrThrow();
      await Redis.instance.delete(cacheKey);

      const permission = await this.domain.db
        .selectFrom("position_permission")
        .innerJoin("permissions", "permissions.id", "permission_id")
        .selectAll()
        .where("position_id", "=", data.positionId)
        .execute();
      const permissions: string[] = [];

      for (const perm of permission) {
        permissions.push(perm.name);
      }

      const result = { permissions, ...data };

      return { result, role: "admin" };
    }

    let result;
    let role: "user" | "supervisor";

    if (otp.role === "user") {
      result = await this.domain.db
        .selectFrom("user")
        .innerJoin("branch_user", "user_id", "user.id")
        .innerJoin("branches", "branch_user.branch_id", "branches.id")
        .select([
          "user.id",
          "mobileNumber",
          "first_name",
          "last_name",
          "active",
          "branches.id as positionId",
          "branches.name as positionName"
        ])
        .where("mobileNumber", "=", entity.mobileNumber)
        .executeTakeFirstOrThrow();
      role = "user";
    } else {
      result = await this.domain.db
        .selectFrom("user")
        .innerJoin("group_user", "user_id", "user.id")
        .innerJoin("groups", "group_user.group_id", "groups.id")
        .select([
          "user.id",
          "mobileNumber",
          "first_name",
          "last_name",
          "active",
          "groups.id as positionId",
          "groups.name as positionName"
        ])
        .where("mobileNumber", "=", entity.mobileNumber)
        .executeTakeFirstOrThrow();
      role = "supervisor";
    }

    await Redis.instance.delete(cacheKey);

    return { result, role: role };
  }

  async registerUser(entity: TRegisterUser, adminContext: AdminPayload) {
    hasPermission(adminContext, "userEditing");

    if ("branch" in entity) {
      const branch = await this.domain.db
        .selectFrom("branches")
        .leftJoin("branch_user", "branch_id", "branches.id")
        .leftJoin("user", "user_id", "user.id")
        .selectAll()
        .where("branches.id", "=", entity.branch)
        .executeTakeFirst();

      if (branch === undefined) {
        throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
      }

      const check = await this.domain.db
        .selectFrom("user")
        .leftJoin("branch_user", "user_id", "user.id")
        .selectAll()
        .where("mobileNumber", "=", entity.mobileNumber)
        .executeTakeFirst();

      if (check !== undefined || branch.active === true) {
        throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
      }

      await this.domain.transaction(async (domain) => {
        const id = await domain.db
          .insertInto("user")
          .values({
            mobileNumber: entity.mobileNumber,
            first_name: entity.firstName,
            last_name: entity.lastName,
            nationalCode: entity.nationalCode,
            type: "branchUser"
          })
          .executeTakeFirst();

        if (id.insertId === undefined) {
          throw new Error("Group insertion did not return an ID.");
        }

        const idx = Number(id.insertId);

        if (branch.active === false) {
          await domain.db.deleteFrom("branch_user")
            .where("user_id", "=", branch.user_id)
            .execute();
        }

        if ("branch" in entity) {
          await domain.db
            .insertInto("branch_user")
            .values({ user_id: idx, branch_id: entity.branch })
            .execute();
        }
      });

      return;
    }

    if ("group" in entity) {
      const group = await this.domain.db
        .selectFrom("groups")
        .leftJoin("group_user", "group_id", "groups.id")
        .leftJoin("user", "user_id", "user.id")
        .selectAll()
        .where("groups.id", "=", entity.group)
        .executeTakeFirst();

      if (group === undefined) {
        throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
      }

      const check = await this.domain.db
        .selectFrom("user")
        .leftJoin("group_user", "user_id", "user.id")
        .selectAll()
        .where("mobileNumber", "=", entity.mobileNumber)
        .executeTakeFirst();

      if (check !== undefined || group.active === true) {
        throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
      }

      await this.domain.transaction(async (domain) => {
        const id = await domain.db
          .insertInto("user")
          .values({
            mobileNumber: entity.mobileNumber,
            first_name: entity.firstName,
            last_name: entity.lastName,
            nationalCode: entity.nationalCode,
            type: "groupUser"
          })
          .executeTakeFirst();

        if (id.insertId === undefined) {
          throw new Error("Group insertion did not return an ID.");
        }

        const idx = Number(id.insertId);

        if (group.active === false) {
          await domain.db.deleteFrom("group_user")
            .where("user_id", "=", group.user_id)
            .execute();
        }

        if ("group" in entity) {
          await domain.db
            .insertInto("group_user")
            .values({ user_id: idx, group_id: entity.group })
            .execute();
        }
      });

      return;
    }

    throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
  }

  async registerAdmin(entity: TRegisterAdmin, adminContext: AdminPayload) {
    hasPermission(adminContext, "userEditing");
    const check = await this.domain.db
      .selectFrom("user")
      .select("id")
      .where("mobileNumber", "=", entity.mobileNumber)
      .execute();

    if (check.length > 0) {
      throw new DomainException(CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
    }

    if (!adminContext.permissions.includes("superUserEditor")) {
      await this.domain.validator.isAncestor(adminContext.positionId, entity.positionId, true);
    }

    const checkPosition = this.domain.db
      .selectFrom("positions")
      .leftJoin("user", "user_id", "user.id")
      .select(["active"])
      .where("positions.id", "=", entity.positionId);

    const resCheck = await checkPosition.executeTakeFirst();

    if (resCheck === undefined) {
      throw new DomainException(CommonCodes.NotFoundDataCode, CommonCodes.NotFoundDataDesc);
    }

    if (resCheck.active === true) {
      throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
    }

    await this.domain.transaction(async (domain) => {
      const id = await domain.db
        .insertInto("user")
        .values({
          mobileNumber: entity.mobileNumber,
          first_name: entity.firstName,
          last_name: entity.lastName,
          nationalCode: entity.nationalCode,
          type: "admin"
        })
        .executeTakeFirst();

      if (id.insertId === undefined) {
        throw new Error("Group insertion did not return an ID.");
      }

      const idx = Number(id.insertId);

      await domain.db
        .updateTable("positions")
        .set({
          user_id: idx
        })
        .where("positions.id", "=", entity.positionId)
        .execute();
    });

    return;
  }
}
