#!/usr/bin/env node
/* eslint-disable @typescript-eslint/class-methods-use-this */
import { HttpStatusCode } from "axios";
import { closeMysql } from "@/data/mysql";
import { WebServer, registerRoutes } from "@/presentation";
import Logger from "@/utils/logger";
import {
  apiPrefix,
  httpHost,
  httpPort,
  isProduction,
  isTest
} from "@/env_values";
import { Redis } from "@/data/redis";

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
    await this.startWebServer();
  }

  async startWebServer(): Promise<void> {
    if (!isProduction) {
      WebServer.set_not_found_handler((req, res) => {
        Logger.debug("called invalid route", req.method, req.path, req.ip);
        res.status(HttpStatusCode.NotFound).send();
      });
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
