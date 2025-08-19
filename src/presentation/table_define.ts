import type { Request, Response, Server } from "hyper-express";
import { finishRes, validateJson, verifyUserAccessGenerator } from "@/presentation/helpers";
import { Domain } from "@/domain";
import {
  editTableS,
  generateTableS,
  generateTableTitlesS,
  retrieveTablePropertyS,
  reuseTableS
} from "@/schema/panel_schema";

async function reuseTable(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, reuseTableS);

  await Domain.panel.reuseTable(body, req.adminContext);

  finishRes(res);
}

async function rTable(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, retrieveTablePropertyS);

  const result = await Domain.panel.retrieveTableSetting(body, req.adminContext);

  finishRes(res, result);
}

async function cTable(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, generateTableS);

  await Domain.panel.createTable(body, req.adminContext);

  finishRes(res);
}

async function editTable(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, editTableS);

  await Domain.panel.editTable(body, req.adminContext);

  finishRes(res);
}

async function getTableTitles(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, generateTableTitlesS);

  await Domain.panel.getTableTitles(body, req.adminContext);

  finishRes(res);
}

export default function routes(server: Server, prefix: string): void {
  server.post(prefix + "/newTable", cTable, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/editTable", editTable, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/TableTitlesAcceptance", getTableTitles, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/getSettingTable", rTable, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/addColumn", reuseTable, { middlewares: [verifyUserAccessGenerator] });
}
