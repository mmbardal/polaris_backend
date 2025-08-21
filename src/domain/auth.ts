// src/domain/auth.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { DomainManagerType } from "@/domain/index";
import type { TLogin, TRegister } from "@/schema/auth_schema";
import { DomainException } from "@/utils/errors";
import { CommonCodes, UserErrorCodes } from "@/domain/errors";

const JWT_SECRET = "your-super-secret-key";

export class Auth {
  constructor(domain: DomainManagerType) {
    this.domain = domain;
  }

  private readonly domain: DomainManagerType;

  async register(entity: TRegister) {
    console.log(entity);
    const existingUser = await this.domain.db
      .selectFrom("users")
      .select("id")
      .where("username", "=", entity.username)
      .executeTakeFirst();

    if (existingUser !== undefined) {
      throw new DomainException(CommonCodes.DuplicateEntryCode, "Username already exists.");
    }

    const passwordHash = await bcrypt.hash(entity.password, 10);

    const newUser = await this.domain.db
      .insertInto("users")
      .values({
        username: entity.username,
        password_hash: passwordHash,
        access_level: entity.accessLevel
      })
      .executeTakeFirstOrThrow();

    return { userId: newUser.insertId?.toString(), message: "User created successfully." };
  }

  // src/domain/auth.ts

  async login(entity: TLogin) {
    const user = await this.domain.db
      .selectFrom("users")
      .selectAll()
      .where("username", "=", entity.username)
      .executeTakeFirst();

    if (!user) {
      throw new DomainException(UserErrorCodes.WrongUsernamePasswordCode, "Invalid username or password.");
    }

    const isPasswordValid = await bcrypt.compare(entity.password, user.password_hash);

    if (!isPasswordValid) {
      throw new DomainException(UserErrorCodes.WrongUsernamePasswordCode, "Invalid username or password.");
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, accessLevel: user.access_level },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return the token AND the user's access level
    return {
      token,
      accessLevel: user.access_level
    };
  }
}
