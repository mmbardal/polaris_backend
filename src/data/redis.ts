import { randomUUID } from "node:crypto";
import assert from "node:assert";
import type { SetOptions } from "redis";
import { createClient } from "redis";
import Logger from "@/utils/logger";

export type RedisClientTypeAlias = ReturnType<typeof createClient>;

export class Redis {
  private constructor(clientType: RedisClientTypeAlias) {
    this.client = clientType;
  }

  readonly client: RedisClientTypeAlias;
  private static _instance: Redis;

  static async init(host: string, port: number, db: number): Promise<void> {
    if (typeof this._instance !== "undefined") {
      return;
    }

    const client = createClient({ url: `redis://${host}:${port}/${db}` }).on("error", (err) => {
      Logger.error("redis error", err);
    });
    const redisClient = await client.connect();

    this._instance = new Redis(redisClient);
  }

  static get instance(): Redis {
    return this._instance;
  }

  async exists(key: string): Promise<boolean> {
    return await this.client.exists(key) === 1;
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async get<T>(key: string, deleteOnGet = false): Promise<T | null> {
    const value = deleteOnGet ? await this.client.getDel(key) : await this.client.get(key);

    return value === null ? null : JSON.parse(value) as unknown as T;
  }

  async set(key: string, value: unknown, options: SetOptions): Promise<void> {
    const serializedValue = typeof value === "string" ? value : JSON.stringify(value);

    await this.client.set(key, serializedValue, options);
  }

  destroy(): void {
    this.client.destroy();
  }
}

interface RedisSessionConfig {
  client: RedisClientTypeAlias;
  ttl: number;
  maxTTL?: number;
  prefixKey: string;
  findBatchSize?: number;
  sessionCount?: number;
}

interface SessionData<T> {
  timestamp: number;
  data: T;
}

export class RedisSession {
  constructor(config: RedisSessionConfig) {
    assert.ok((/\w+/).test(config.prefixKey), "Invalid prefix key");

    this.client = config.client;
    this.ttl = config.ttl;
    this.prefixKey = config.prefixKey;
    this.regex = new RegExp(`^${config.prefixKey}(:?.+)_\\d{13}[a-f\\d]{32}$`);
    this.batchSize = config.findBatchSize ?? 100;
    this.sessionCount = config.sessionCount ?? 0;
    this.maxTTL = config.maxTTL;
  }

  private readonly regex: RegExp;
  private readonly client: RedisClientTypeAlias;
  private readonly ttl: number;
  private readonly maxTTL?: number;
  private readonly prefixKey: string;
  private readonly batchSize: number;
  private readonly sessionCount: number;

  private static escapePattern(str: string): string {
    return str.replaceAll(/[\\^$*+?.()|[\]{}]/g, String.raw`\$&`);
  }

  private async* scanPattern(pattern: string): AsyncGenerator<string[]> {
    let cursor = 0;

    do {
      const result = await this.client.scan(cursor.toString(), { MATCH: pattern, COUNT: this.batchSize });
      cursor = Number.parseInt(result.cursor);

      if (result.keys.length > 0) {
        yield result.keys;
      }
    } while (cursor !== 0);
  }

  private async deleteOldestSessions(userId: string | number, count: number): Promise<void> {
    const pattern = `${this.prefixKey}${RedisSession.escapePattern(userId.toString())}_*`;
    const keys: string[] = [];

    for await (const batch of this.scanPattern(pattern)) {
      keys.push(...batch);
    }

    const sessions = keys
      .map((key) => {
        // Extract timestamp from key
        const timestamp = Number.parseInt(key.slice(-45, -32), 10);

        return { key, timestamp: Number.isNaN(timestamp) ? 0 : timestamp };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, count);

    if (sessions.length > 0) {
      await this.client.del(sessions.map((s) => s.key));
    }
  }

  /**
     * Create a session
     * @param userId user id
     * @param data session data
     */
  async create(userId: string | number, data: Record<string, unknown>): Promise<string> {
    const uuid = randomUUID()
      .toLowerCase()
      .replaceAll("-", "");

    const key = `${this.prefixKey}${userId}_${Date.now()}${uuid}`;
    const serializedData = JSON.stringify({ data, timestamp: Date.now() } as SessionData<unknown>);

    if (this.sessionCount > 0) {
      const currentCount = await this.countUsers(userId);

      if (currentCount >= this.sessionCount) {
        await this.deleteOldestSessions(userId, currentCount - this.sessionCount + 1);
      }
    }

    await this.client.set(key, serializedData, { EX: this.ttl });

    return key;
  }

  /**
     * Read a session
     * @param key session id to read
     * @param updateTTL if true, the TTL of the key will be updated
     */
  async read<T>(key: string, updateTTL: boolean): Promise<T> {
    if (!this.regex.test(key)) {
      throw new Error("Invalid key");
    }

    const serializedData = updateTTL
      ? await this.client.getEx(key, { EX: this.ttl })
      : await this.client.get(key);

    if (serializedData === null) {
      throw new Error("Session not found");
    }

    const data = JSON.parse(serializedData) as unknown as SessionData<T>;

    if (updateTTL && this.maxTTL !== undefined && Date.now() - data.timestamp > this.maxTTL * 1000) {
      await this.client.del(key);
      throw new Error("Session expired");
    }

    return data.data;
  }

  /**
     * Update a session
     * @param key session id to update
     * @param data new session data
     * @param keepTTL if true, the TTL of the key will be kept
     */
  async update(key: string, data: Record<string, unknown>, keepTTL?: true): Promise<void> {
    if (!this.regex.test(key)) {
      throw new Error("Invalid key");
    }

    const session = await this.client.get(key);

    if (session === null) {
      throw new Error("Session not found");
    }

    const sessionPayload = JSON.parse(session) as unknown as SessionData<unknown>;

    const serializedData = JSON.stringify({ data, timestamp: sessionPayload.timestamp } as SessionData<unknown>);

    await this.client.set(
      key,
      serializedData,
      {
        XX: true,
        KEEPTTL: keepTTL
      }
    );
  }

  /**
     * Delete a session
     * @param key session id to delete
     */
  async delete(key: string): Promise<void> {
    if (!this.regex.test(key)) {
      throw new Error("Invalid key");
    }

    await this.client.del(key);
  }

  /**
     * Check if a key exists
     * @param key session id to check
     */
  async exists(key: string): Promise<boolean> {
    if (!this.regex.test(key)) {
      throw new Error("Invalid key");
    }

    return await this.client.exists(key) === 1;
  }

  /**
     * Delete user sessions
     * @param userId if not provided, all user sessions will be deleted
     */
  async deleteUsers(userId?: string | number): Promise<void> {
    const pattern = userId === undefined
      ? `${this.prefixKey}*`
      : `${this.prefixKey}${(RedisSession.escapePattern(userId.toString()))}_*`;

    const tr = this.client.multi();

    for await (const keys of this.scanPattern(pattern)) {
      tr.unlink(keys);
    }

    await tr.exec();
  }

  /**
     * Update user sessions
     * @param userId user id
     * @param data new session data
     */
  async updateUsers(userId: string | number, data: Record<string, unknown>): Promise<void> {
    const pattern = `${this.prefixKey}${RedisSession.escapePattern(userId.toString())}_*`;

    const tr = this.client.multi();

    for await (const keys of this.scanPattern(pattern)) {
      tr.mSet(keys.map((key) => [key, JSON.stringify({ data, timestamp: Date.now() })]));
    }

    await tr.exec();
  }

  /**
     * Count user sessions
     * @param userId if not provided, all user sessions will be counted
     */
  async countUsers(userId?: string | number): Promise<number> {
    const pattern = userId === undefined
      ? `${this.prefixKey}*`
      : `${this.prefixKey}${RedisSession.escapePattern(userId.toString())}_*`;
    let count = 0;

    for await (const keys of this.scanPattern(pattern)) {
      count += keys.length;
    }

    return count;
  }

  /**
     * Refresh TTL of a key
     * @param key session id to refresh
     */
  async refreshTTL(key: string): Promise<boolean> {
    if (!this.regex.test(key)) {
      throw new Error("Invalid key");
    }

    return await this.client.expire(key, this.ttl) === 1;
  }

  /**
     * List user sessions
     * @param userId user id
     * @param count number of keys to return
     * @param cursor cursor to start
     */
  async listSessions(userId: string | number, count: number, cursor = 0): Promise<{ keys: string[]; cursor: number }> {
    const pattern = `${this.prefixKey}${RedisSession.escapePattern(userId.toString())}_*`;

    const res = await this.client.scan(cursor.toString(), { MATCH: pattern, COUNT: count });

    return { keys: res.keys, cursor: Number.parseInt(res.cursor) };
  }
}
