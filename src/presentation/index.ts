import { Server } from "hyper-express";
import { httpExceptionHandlerMiddleware } from "./errorHandler";
import auth from "@/presentation/auth";
import vahed_config from "@/presentation/vahed_config";
import vahed from "@/presentation/vahed";
import panel from "@/presentation/panel";
import tableDefine from "@/presentation/table_define";
import tableShow from "@/presentation/table_showing";
import permissionSetting from "@/presentation/permission_setting";

export const WebServer = new Server();

WebServer.set_error_handler(httpExceptionHandlerMiddleware);

export function registerRoutes(prefix: string): void {
  auth(WebServer, prefix + "/auth");
  vahed_config(WebServer, prefix + "/vahedConfig");
  vahed(WebServer, prefix + "/vahed");
  panel(WebServer, prefix + "/panel");
  tableDefine(WebServer, prefix + "/tableDefine");
  tableShow(WebServer, prefix + "/tableShow");
  permissionSetting(WebServer, prefix + "/permissionSetting");
}
