/* eslint-disable no-console */
// eslint-disable-next-line import-x/no-extraneous-dependencies
import {
  getDialect,
  generate,
  IdentifierNode

} from "kysely-codegen";
import { mysqlDatabase, mysqlHosts, mysqlPass, mysqlPort, mysqlUser } from "@/env_values";

const dialect = getDialect("mysql");

dialect.adapter.scalars.bigint = new IdentifierNode("string");
dialect.adapter.scalars.decimal = new IdentifierNode("number");

const db = await dialect.introspector.connect({
  connectionString: `mysql://${mysqlUser}:${mysqlPass}@${mysqlHosts.split(",")[0]}:${mysqlPort}/${mysqlDatabase}`,
  dialect
});
const destinationFile = "./src/data/models.ts";

console.info(`generating ${destinationFile}`);

await generate({
  db: db,
  dialect: dialect,
  outFile: destinationFile,
  excludePattern: "goose_db_version"
});

await db.destroy();
