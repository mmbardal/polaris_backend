/* eslint-disable no-console */
// eslint-disable-next-line import-x/no-extraneous-dependencies
import {
  getDialect,
  generate,
  IdentifierNode,
  GenericExpressionNode,
  RawExpressionNode,
  JsonColumnTypeNode,
  ArrayExpressionNode,
  ObjectExpressionNode, PropertyNode, UnionExpressionNode, LiteralNode

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
  excludePattern: "goose_db_version",
  overrides: {
    columns: {
      "user.SU": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "user.ST": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "user.AU": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "user.CP": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "user.GE": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "user.createGroup": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "user.active": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "user.changeReadAccess": new GenericExpressionNode("Generated", [new RawExpressionNode("boolean")]),
      "table_definition.old": new JsonColumnTypeNode(new ArrayExpressionNode(new ObjectExpressionNode([
        new PropertyNode("name", new IdentifierNode("string")),
        new PropertyNode("model", new UnionExpressionNode([
          new LiteralNode("anyThings"),
          new LiteralNode("phoneNumber"),
          new LiteralNode("homeNumber"),
          new LiteralNode("nationalCode"),
          new LiteralNode("comboBox"),
          new LiteralNode("decimal"),
          new LiteralNode("date")
        ])),
        new PropertyNode("regex", new IdentifierNode("string")),
        new PropertyNode("nullable", new IdentifierNode("boolean")),
        new PropertyNode("comboBoxValues", new ArrayExpressionNode(new IdentifierNode("string")))
      ]))),
      "table_definition.columns_properties": new JsonColumnTypeNode(new ArrayExpressionNode(new ObjectExpressionNode([
        new PropertyNode("name", new IdentifierNode("string")),
        new PropertyNode("model", new UnionExpressionNode([
          new LiteralNode("anyThings"),
          new LiteralNode("phoneNumber"),
          new LiteralNode("homeNumber"),
          new LiteralNode("nationalCode"),
          new LiteralNode("comboBox"),
          new LiteralNode("decimal"),
          new LiteralNode("date")
        ])),
        new PropertyNode("regex", new IdentifierNode("string")),
        new PropertyNode("nullable", new IdentifierNode("boolean")),
        new PropertyNode("comboBoxValues", new ArrayExpressionNode(new IdentifierNode("string")))
      ])))
    }
  }
});

await db.destroy();
