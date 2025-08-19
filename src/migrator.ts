#!/usr/bin/env node
/* eslint-disable no-console */
import { exec } from "node:child_process";
import { format } from "node:util";
import { stringValue } from "@/utils/env";

stringValue("GOOSE_DRIVER");
stringValue("GOOSE_MIGRATION_DIR");

// cluster:123456789@tcp(192.168.101.208:3306)/graduation?parseTime=true
process.env.GOOSE_DBSTRING = format(
  "%s:%s@tcp(%s:%s)/%s?parseTime=true",
  stringValue("MYSQL_USERNAME"),
  stringValue("MYSQL_PASSWORD"),
  stringValue("MYSQL_HOSTS").split(",")[0],
  stringValue("MYSQL_PORT"),
  stringValue("MYSQL_DATABASE")
);

const args = process.argv.slice(2);
const command = args[0];

if (command === "") {
  console.error(
    "Error: No command provided. Usage:\n"
    + "  yarn migrate:up\n"
    + "  yarn migrate:down\n"
    + "  yarn migrate:create <migration_name>"
  );
  process.exit(1);
}

switch (command) {
  case "up":
    exec(`goose up`, (error, stdout, stderr) => {
      if (error !== null) {
        console.error(`Error running migrations: ${stderr}`);
        process.exit(1);
      }

      console.log(stdout, stderr);
    });
    break;

  case "down":
    console.log("Rolling back migrations (goose down)...");
    exec(`goose down`, (error, stdout, stderr) => {
      if (error !== null) {
        console.error(`Error rolling back migrations: ${stderr}`);
        process.exit(1);
      }

      console.log(stdout, stderr);
    });
    break;

  case "create": {
    if (args.length < 2) {
      console.error("Error: Please provide a migration name. Usage: yarn migrate:create <migration_name>");
      process.exit(1);
    }

    const name = args.slice(1).join(" ");
    const sanitizedName = name

      // Replace spaces/dashes with _
      .replaceAll(/[\s-]+/g, "_")

      // Remove everything else except a-z, A-Z, 0-9, and _;
      .replaceAll(/[^a-zA-Z0-9_]/g, "");

    console.log(`Creating a new migration: ${name}`);
    exec(`goose create "${sanitizedName}" sql`, (error, stdout, stderr) => {
      if (error !== null) {
        console.error(`Error creating migration: ${stderr}`);
        process.exit(1);
      }

      console.log(stdout, stderr);
    });
    break;
  }

  default:
    console.error(
      `Error: Unknown command "${command}". Usage:\n`
      + "  yarn migrate:up\n"
      + "  yarn migrate:down\n"
      + "  yarn migrate:create <migration_name>"
    );
    process.exit(1);
}
