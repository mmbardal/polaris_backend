import type { Request, Response, Server } from "hyper-express";
import { finishRes, validateJson, verifyUserAccessGenerator } from "@/presentation/helpers";
import { Domain } from "@/domain";
import {
  activateS,
  changePermissionS,
  changeReadWritePermissionS, getTableReadersS,
  setWriteAccessS
} from "@/schema/panel_schema";

async function setWriteAccess(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, setWriteAccessS);

  await Domain.panel.setWriteAccess(body, req.adminContext);

  finishRes(res);
}

async function setReadAccess(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, changeReadWritePermissionS);

  await Domain.panel.setReadAccess(body, req.adminContext);

  finishRes(res);
}

async function getTableReaders(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getTableReadersS);

  const result = await Domain.panel.getTableReaders(body, req.adminContext);

  finishRes(res, { result });
}

async function changePermission(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, changePermissionS);

  await Domain.panel.changePermission(body, req.adminContext);

  finishRes(res);
}

async function activate(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, activateS);

  await Domain.panel.activate(body, req.adminContext);

  finishRes(res);
}

export default function routes(server: Server, prefix: string): void {
  server.post(prefix + "/changePermission", changePermission, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/setReadAccess", setReadAccess, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/getTableReaders", getTableReaders, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/setWriteAccess", setWriteAccess, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/activate", activate, { middlewares: [verifyUserAccessGenerator] });
}
