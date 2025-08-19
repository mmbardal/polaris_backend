import type { Request, Response, Server } from "hyper-express";
import { finishRes, validateJson, verifyUserAccessGenerator } from "@/presentation/helpers";
import { Domain } from "@/domain";
import {
  approveS, assignS,
  changePersonalInfoS, exportTableS, searchS
} from "@/schema/panel_schema";
import { getUserS } from "@/schema/getList";

async function changePersonalInfo(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, changePersonalInfoS);

  await Domain.panel.changePersonalInfo(body, req.adminContext);

  finishRes(res);
}

async function search(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, searchS);

  const result = await Domain.panel.search(body, req.adminContext);

  finishRes(res, { result });
}

async function checkPosition(req: Request, res: Response): Promise<void> {
  const result = await Domain.panel.checkPosition(req.adminContext);

  finishRes(res, { result });
}

async function assign(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, assignS);

  await Domain.panel.assign(body, req.adminContext);

  finishRes(res);
}

async function approve(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, approveS);

  await Domain.panel.approve(body, req.adminContext);

  finishRes(res);
}

async function exportTable(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, exportTableS);
  const result = await Domain.panel.exportTable(body, req.adminContext);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.setHeader("Content-Length", String(result.size));

  res.send(result.file);
}

async function getAdminSubGroup(req: Request, res: Response): Promise<void> {
  const result = await Domain.getList.getAdminSubGroup(req.adminContext);
  finishRes(res, { result });
}

async function getUser(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getUserS);
  const result = await Domain.getList.getUser(body, req.adminContext);
  finishRes(res, { result });
}

export default function routes(server: Server, prefix: string): void {
  server.post(prefix + "/approveTable", approve, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/getAdminSubGroup", getAdminSubGroup, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/getUser", getUser, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/search", search, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/checkPosition", checkPosition, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/assign", assign, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/changePersonalInfo", changePersonalInfo, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/exportTable", exportTable, { middlewares: [verifyUserAccessGenerator] });
}
