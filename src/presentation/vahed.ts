import type { Request, Response, Server } from "hyper-express";
import {
  finishRes, validateFormData,
  validateJson,
  verifyBranchAccessGenerator
} from "@/presentation/helpers";
import { Domain } from "@/domain";
import { approveTableBranchS, csvUploadS, getBranchTablesS } from "@/schema/vahed_schema";
import { CommonCodes } from "@/domain/errors";
import { retrieveBranchTableS, retrieveTablePropertyS } from "@/schema/panel_schema";

async function getBranchTables(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getBranchTablesS);

  const result = await Domain.vahed.getBranchTables(body, req.branchContext);

  finishRes(res, result);
}

async function getGroupTables(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getBranchTablesS);

  const result = await Domain.vahed.getGroupTables(body, req.branchContext);

  finishRes(res, result);
}

async function downloadTemplate(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, retrieveTablePropertyS);

  const result = await Domain.vahed.downloadTemplate(body, req.branchContext);

  // 2. Set the necessary headers for a file download
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.setHeader("Content-Length", String(result.size));

  res.send(result.file);
}

async function downloadBranchData(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, retrieveBranchTableS);

  const result = await Domain.vahed.downloadBranchTable(body, req.branchContext);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.setHeader("Content-Length", String(result.size));

  res.send(result.file);
}

async function uploadBranchData(req: Request, res: Response): Promise<void> {
  const body = await validateFormData(req, csvUploadS);

  const { success, errors } = await Domain.vahed.uploadBranchData(body, req.branchContext);

  if (!success) {
    finishRes(
      res,
      {
        ...errors
      },
      CommonCodes.unprocessableEntitiesCode,
      CommonCodes.unprocessableEntitiesDesc,
      400
    );

    return;
  }

  finishRes(res);
}

async function approveTableBranch(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, approveTableBranchS);

  await Domain.vahed.approveTableBranch(body, req.branchContext);

  finishRes(res);
}

async function viewBranchData(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, retrieveBranchTableS);

  const result = await Domain.vahed.viewBranchData(body, req.branchContext);

  finishRes(res, result);
}

export default function routes(server: Server, prefix: string): void {
  server.post(prefix + "/getBranchTables", getBranchTables, { middlewares: [verifyBranchAccessGenerator] });
  server.post(prefix + "/downloadTemplate", downloadTemplate, { middlewares: [verifyBranchAccessGenerator] });
  server.post(prefix + "/downloadBranchData", downloadBranchData, { middlewares: [verifyBranchAccessGenerator] });
  server.post(prefix + "/viewBranchData", viewBranchData, { middlewares: [verifyBranchAccessGenerator] });
  server.post(prefix + "/uploadBranchData", uploadBranchData, { middlewares: [verifyBranchAccessGenerator] });
  server.post(prefix + "/getGroupTables", getGroupTables, { middlewares: [verifyBranchAccessGenerator] });
  server.post(prefix + "/approveTableBranch", approveTableBranch, { middlewares: [verifyBranchAccessGenerator] });
}
