import type { Request, Response, Server } from "hyper-express";
import {
  finishRes,
  validateJson,
  verifyUserAccessGenerator
} from "@/presentation/helpers";
import { Domain } from "@/domain";
import { retrieveTablePropertyS } from "@/schema/panel_schema";
import { getTableS, getTableTitlesS, getWriteAccessS } from "@/schema/getList";

async function table(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getTableS);
  const result = await Domain.getList.getTable(body, req.adminContext);
  finishRes(res, result);
}

async function tableTitles(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getTableTitlesS);
  const result = await Domain.getList.getTableTitles(body);
  finishRes(res, result);
}

async function retrieveTableData(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, retrieveTablePropertyS);

  const result = await Domain.panel.retrieveTableData(body, req.adminContext);

  finishRes(res, { result });
}

async function retrieveTableProperty(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, retrieveTablePropertyS);

  const result = await Domain.panel.retrieveTableProperty(body, req.adminContext);

  finishRes(res, { result });
}

async function TableRecipientStatus(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getWriteAccessS);
  const result = await Domain.getList.TableRecipientStatus(body, req.adminContext);
  finishRes(res, { result });
}

export default function routes(server: Server, prefix: string): void {
  server.post(prefix + "/showData", retrieveTableData, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/showDataProperty", retrieveTableProperty, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/getTableFlow", table, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/getTableTitles", tableTitles, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/TableRecipientStatus", TableRecipientStatus, { middlewares: [verifyUserAccessGenerator] });
}
