import type { LogEvent } from "kysely";
import { Kysely, MysqlDialect } from "kysely";
import { createPoolCluster } from "mysql2";
import type { DB } from "@/data/models";
import { mysqlDatabase, mysqlHosts, mysqlPass, mysqlPort, mysqlUser } from "@/env_values";
import Logger from "@/utils/logger";

const poolCluster = createPoolCluster({ defaultSelector: "RR" });

for (const [index, mysqlHost] of mysqlHosts.split(",").entries()) {
  poolCluster.add(`node${index + 1}`, {
    host: mysqlHost,
    port: mysqlPort,
    user: mysqlUser,
    password: mysqlPass,
    database: mysqlDatabase,
    connectionLimit: 15,
    supportBigNumbers: true,
    bigNumberStrings: true,
    typeCast: function (field, next) {
      if (field.type === "TINY" && field.length === 1) {
        // 1 = true, 0 = false, null = null
        const val = field.string();

        return val === null ? null : val === "1";
      }

      return next();
    }
  });
}

export const mysqlConn = new Kysely<DB>({
  dialect: new MysqlDialect({ pool: poolCluster }),
  log: (event: LogEvent) => {
    if (event.level === "error") {
      Logger.error("MySQL error", event.error);
    } else {
      const parameters = Array.from(event.query.parameters);
      const query = event.query.sql.replaceAll("?", () => {
        const param = parameters.shift() as string | number | boolean | null;

        return typeof param === "string" ? `'${param}'` : `${param}`;
      });
      Logger.debug("MySQL query", { query });
    }
  }
});

export async function closeMysql(): Promise<void> {
  await mysqlConn.destroy();
  poolCluster.end();
}
