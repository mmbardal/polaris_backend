#!/usr/bin/env node
/* eslint-disable @typescript-eslint/class-methods-use-this */
import { HttpStatusCode } from "axios";
import { Session } from "./data/session";
import { closeMysql } from "@/data/mysql";
import { WebServer, registerRoutes } from "@/presentation";
import Logger from "@/utils/logger";
import {
  apiPrefix,
  httpHost,
  httpPort,
  isProduction,
  isTest,
  redisDb,
  redisHost, redisPort
} from "@/env_values";
import { Redis } from "@/data/redis";
import { initApiDoc } from "@/utils/doc";

class Application {
  private constructor() {
    if (isTest) {
      Logger.create(false, "error");
    } else if (isProduction) {
      Logger.create(true, "info");
    } else {
      Logger.create(false, "debug");
    }
  }

  static instance: Application = new Application();

  async bootstrap(): Promise<void> {
    await this.startRedis();
    await this.startWebServer();
  }

  async startRedis(): Promise<void> {
    try {
      await Redis.init(redisHost, redisPort, redisDb);
      Session.init(Redis.instance.client);
    } catch (error) {
      Logger.error(`Redis Error: ${(error as Error).message}`, { redisHost, redisPort, redisDb, e: error });
      process.exit(1);
    }
  }

  async startWebServer(): Promise<void> {
    if (!isProduction) {
      WebServer.set_not_found_handler((req, res) => {
        Logger.debug("called invalid route", req.method, req.path, req.ip);
        res.status(HttpStatusCode.NotFound).send();
      });

      await initApiDoc(WebServer, "openapi.json", false);
    }

    registerRoutes(apiPrefix);
    await WebServer.listen(httpPort, httpHost);

    Logger.info("server starting", { http: `http://${httpHost}:${httpPort}` });
  }

  async destroy(): Promise<void> {
    Logger.info("Shutting down application...");
    await WebServer.shutdown();
    await closeMysql();
  }
}

for (const e of ["SIGINT", "SIGTERM"]) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.once(e, async () => {
    await Application.instance.destroy();
    Redis.instance.destroy();
    process.exit(0);
  });
}

await Application.instance.bootstrap();
