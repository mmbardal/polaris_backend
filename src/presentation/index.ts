import { Server } from "hyper-express";
import { httpExceptionHandlerMiddleware } from "./errorHandler";
import panel from "@/presentation/panel";

export const WebServer = new Server();

WebServer.set_error_handler(httpExceptionHandlerMiddleware);

export function registerRoutes(prefix: string): void {
  panel(WebServer, prefix + "/panel");
}
