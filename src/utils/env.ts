/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-console */
import { existsSync, readFileSync } from "node:fs";

/* @__NO_SIDE_EFFECTS__ */
function getEnv(key: string): string | undefined {
  const fileKey = process.env[`${key}_FILE`];

  if (fileKey !== undefined) {
    if (!existsSync(fileKey)) {
      process.exit(1);
    }

    return readFileSync(fileKey).toString();
  } else {
    return process.env[key];
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function stringValue(key: string, defaultValue?: string): string {
  const value = getEnv(key);

  if (value !== undefined) {
    return value;
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    console.error(`'${key}' Environment variable is not set`);
    process.exit(1);
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function intValue(key: string, defaultValue?: number): number {
  const value = getEnv(key);

  if (value !== undefined) {
    return Number.parseInt(value);
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    console.error(`'${key}' Environment variable is not set`);
    process.exit(1);
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function floatValue(key: string, defaultValue?: number): number {
  const value = getEnv(key);

  if (value !== undefined) {
    return Number.parseFloat(value);
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    console.error(`'${key}' Environment variable is not set`);
    process.exit(1);
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function boolValue(key: string, defaultValue?: boolean): boolean {
  const value = getEnv(key);

  if (value !== undefined) {
    if (value === "true" || value === "false") {
      return value === "true";
    } else {
      console.error(`'${key}' Environment variable is set but value isn't boolean`);
      process.exit(1);
    }
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    console.error(`'${key}' Environment variable is not set`);
    process.exit(1);
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function enumValue<T extends string>(key: string, enums: T[], defaultValue?: T): T {
  const value = getEnv(key);

  if (value !== undefined) {
    if (!enums.includes(value as T)) {
      console.error(`'${key}' Environment variable must be one of these values [${enums.join(",")}]`);
      process.exit(1);
    }

    return value as T;
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    console.error(`'${key}' Environment variable is not set, must be one of these values [${enums.join(",")}]`);
    process.exit(1);
  }
}
