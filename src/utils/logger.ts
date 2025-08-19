import type { Format, TransformableInfo } from "logform";
import type { Logger as WinstonLogger } from "winston";
import { createLogger, format, transports } from "winston";

interface LogStack {
  located: string;
  func: string;
}

type LevelTypes = "debug" | "error" | "info" | "warn";

const customFormatter = (): Format => format((info: TransformableInfo): TransformableInfo => {
  if (Array.isArray(info.meta)) {
    for (const [index, element] of info.meta.entries()) {
      if (typeof element === "object") {
        for (const key in element) {
          if (info[key] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            info[`_${key}`] = element[key];
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            info[key] = element[key];
          }
        }

        info.meta.splice(index, 1);
      }
    }
  }

  if (info.meta === undefined || (info.meta as unknown as unknown[]).length === 0) {
    delete info.meta;
  }

  return info;
})();

const productionLogger = (level: LevelTypes, handleExceptions: boolean): WinstonLogger => {
  return createLogger({
    level,
    format: format.combine(customFormatter(), format.json()),
    transports: [
      new transports.Console({
        handleExceptions
      })
    ]
  });
};

const devLogger = (level: LevelTypes, handleExceptions: boolean): WinstonLogger => {
  return createLogger({
    level,
    format: format.combine(customFormatter(), format.prettyPrint({ depth: 30, colorize: true })),
    transports: [
      new transports.Console({
        handleExceptions
      })
    ]
  });
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Logger {
  private static winstonLogger: WinstonLogger | undefined;

  static create(releaseMode: boolean, level: LevelTypes = "info", handleExceptions = false): void {
    if (this.winstonLogger === undefined) {
      Logger.winstonLogger = releaseMode
        ? productionLogger(level, handleExceptions)
        : devLogger(level, handleExceptions);
    }
  }

  static logStack(error: Error): LogStack {
    const content = error.stack?.split("\n")[2];
    let located = "";

    if (content !== undefined && content.length > 0) {
      const openParenIndex = content.indexOf("(");
      const closeParenIndex = content.lastIndexOf(")");
      located = content.replace("at", "").trim();

      if (openParenIndex !== -1 && closeParenIndex !== -1) {
        located = content.slice(openParenIndex + 1, closeParenIndex).trim();
      }
    }

    const stacks = error.stack?.split("\n");
    let func = "";

    if (stacks !== undefined) {
      const result = stacks[2].trim().replace("at", "")
        .trim()
        .split(" ")[0] ?? "";
      func = result.replace(">", "").replace("<", "");
    }

    return {
      located,
      func
    };
  }

  static debug(msg: string, ...meta: unknown[]): void {
    const { located, func } = Logger.logStack(new Error("dummy"));
    Logger.winstonLogger?.log("debug", msg, { func, located, meta });
  }

  static info(msg: string, ...meta: unknown[]): void {
    const { located, func } = Logger.logStack(new Error("dummy"));
    Logger.winstonLogger?.log("info", msg, { func, located, meta });
  }

  static warn(msg: string, ...meta: unknown[]): void {
    const { located, func } = Logger.logStack(new Error("dummy"));
    Logger.winstonLogger?.log("warn", msg, { func, located, meta });
  }

  static error(msg: string, ...meta: unknown[]): void {
    const { located, func } = Logger.logStack(new Error("dummy"));
    Logger.winstonLogger?.log("error", msg, { func, located, meta });
  }

  static errorTrace(msg: string, error: Error, ...meta: unknown[]): void {
    const e = new Error("dummy");
    const { located, func } = Logger.logStack(e);
    Logger.winstonLogger?.log("error", msg, { func, located, meta, trace: error.stack });
  }
}

export default Logger;
