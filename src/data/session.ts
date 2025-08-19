import type { RedisClientTypeAlias } from "./redis";
import { RedisSession } from "./redis";
import { maxSessionTTL, sessionTTL } from "@/env_values";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Session {
  private static _adminSession: RedisSession;
  private static _branchSession: RedisSession;

  static get adminSession(): RedisSession {
    return Session._adminSession;
  }

  static get branchSession(): RedisSession {
    return Session._branchSession;
  }

  static init(client: RedisClientTypeAlias): void {
    this._adminSession = new RedisSession({
      client: client,
      ttl: sessionTTL,
      prefixKey: "ua",
      maxTTL: maxSessionTTL
    });

    this._branchSession = new RedisSession({
      client: client,
      ttl: sessionTTL,
      prefixKey: "ub",
      maxTTL: maxSessionTTL
    });
  }
}
