import type { Request, Response, Server } from "hyper-express";
import { finishRes, validateJson, verifyUserAccessGenerator } from "@/presentation/helpers";
import { Domain } from "@/domain";
import {
  checkS,
  createGroupS, deleteGroups, editGroupS,
  getGroupBranhcesS
} from "@/schema/getList";

async function getBranches(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getGroupBranhcesS);
  const result = await Domain.getList.getBranches(body);
  finishRes(res, { result });
}

async function getGroups(_: Request, res: Response): Promise<void> {
  const result = await Domain.getList.getGroups();
  finishRes(res, { result });
}

async function createGroup(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, createGroupS);
  await Domain.getList.createGroup(body, req.adminContext);
  finishRes(res);
}

async function editGroup(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, editGroupS);
  await Domain.getList.editGroup(body, req.adminContext);
  finishRes(res);
}

async function deleteGroup(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, deleteGroups);
  await Domain.getList.deleteGroup(body, req.adminContext);
  finishRes(res);
}

async function check(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, checkS);
  const result = await Domain.getList.check(body, req.adminContext);
  finishRes(res, { result });
}

export default function routes(server: Server, prefix: string): void {
  server.post(prefix + "/branches", getBranches, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/groups", getGroups, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/createGroup", createGroup, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/editGroup", editGroup, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/deleteGroup", deleteGroup, { middlewares: [verifyUserAccessGenerator] });
  server.post(prefix + "/check", check, { middlewares: [verifyUserAccessGenerator] });
}
