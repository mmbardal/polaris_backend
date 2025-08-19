import { PassThrough } from "node:stream";
import type { MiddlewareNext, Request as HyperRequest, Response } from "hyper-express";
import mime from "mime";
import type { ValidateFunction } from "ajv";
import busboy from "busboy";
import { HttpStatusCode } from "axios";
import { isProduction } from "@/env_values";
import Logger from "@/utils/logger";
import { CommonCodes } from "@/domain/errors";
import type { AdminPayload, BranchPayload } from "@/domain/types";
import { Session } from "@/data/session";

export class HttpException extends Error {
  constructor(statusCode: HttpStatusCode, msg?: string) {
    super(msg);

    this.statusCode = statusCode;
  }

  readonly statusCode: HttpStatusCode;
}

export interface FormDataFile {
  name: string;
  mimeType: string;
  file: Buffer;
}

export async function formDataToObject(
  req: HyperRequest
): Promise<Record<string, FormDataFile | FormDataFile[] | string>> {
  if (!(/^(multipart\/.+);(.*)$/i).test(req.header("content-type"))) {
    throw new HttpException(HttpStatusCode.BadRequest);
  }

  return new Promise((resolve, reject) => {
    const ret: Record<string, FormDataFile | FormDataFile[] | string> = {};
    const files: Record<string, FormDataFile[]> = {};

    const bb = busboy({ headers: req.headers, defParamCharset: "utf8" });

    bb
      .on("file", (name, file, info) => {
        if (!Object.hasOwn(files, name)) {
          files[name] = [];
        }

        const chunks: Buffer[] = [];

        file
          .on("data", (data) => {
            chunks.push(data as Buffer);
          })
          .on("close", () => {
            files[name].push({
              name: info.filename,
              mimeType: mime.getType(info.filename) ?? "application/octet-stream",
              file: Buffer.concat(chunks)
            });
          })
          .on("error", (err) => {
            reject(err);
          });
      })
      .on("field", (name, val) => {
        ret[name] = val;
      })
      .on("close", () => {
        for (const [name, file] of Object.entries(files)) {
          if (file.length === 1) {
            ret[name] = { file: file[0].file, name: file[0].name, mimeType: file[0].mimeType };
          } else if (file.length > 1) {
            ret[name] = [];

            for (const f of file) {
              ret[name] = { file: f.file, name: f.name, mimeType: f.mimeType };
            }
          } else {
            reject(new Error("files is empty"));
          }
        }

        resolve(ret);
      })
      .on("error", (err: Error) => {
        reject(err);
      });

    req.pipe(bb);
  });
}

export async function validateJson<T>(req: HyperRequest, validator: ValidateFunction<T>): Promise<T> {
  let returnError;

  try {
    const data = JSON.parse(await req.text()) as T;

    if (validator(data)) {
      return data;
    }

    Logger.error("Validation Error", { data, errors: validator.errors });
    returnError = JSON.stringify(validator.errors);
  } catch (error) {
    Logger.error("validation error", { error });
    returnError = error;
  }

  throw new HttpException(HttpStatusCode.BadRequest, returnError as string);
}

export function validateParams<T>(req: HyperRequest, validator: ValidateFunction<T>): T {
  const data = req.path_parameters as T;

  if (validator(data)) {
    return data;
  }

  Logger.error("Validation Error", { params: req.path_parameters, errors: validator.errors });

  throw new HttpException(HttpStatusCode.BadRequest);
}

export function validateQuery<T>(req: HyperRequest, validator: ValidateFunction<T>): T {
  const data = req.query_parameters as T;

  if (validator(data)) {
    return data;
  }

  Logger.error("Validation Error", { query: req.query_parameters, errors: validator.errors });

  throw new HttpException(HttpStatusCode.BadRequest);
}

export async function validateFormData<T>(req: HyperRequest, validator: ValidateFunction<T>): Promise<T> {
  try {
    const data = (await formDataToObject(req)) as T;

    if (validator(data)) {
      return data;
    }

    Logger.error("Validation Error", { data: Object.keys(data), errors: validator.errors });
  } catch { /* empty */
  }

  throw new HttpException(HttpStatusCode.BadRequest);
}

export interface AdminRawPayload {
  data: AdminPayload;
}

export interface BranchRawPayload {
  data: BranchPayload;
}

declare module "hyper-express" {
  interface Request {
    adminContext: AdminPayload;
    branchContext: BranchPayload;
  }
}

export async function verifyUserAccessGenerator(
  req: HyperRequest,
  _res: Response,
  _next: MiddlewareNext
): Promise<void> {
  const token = req.cookies.token;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (token === "" || token === undefined) {
    throw new HttpException(HttpStatusCode.Unauthorized);
  }

  try {
    req.adminContext = await Session.adminSession.read(token, true);

    return;
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(HttpStatusCode.Unauthorized);
  }
}

export async function verifyBranchAccessGenerator(
  req: HyperRequest,
  _res: Response,
  _next: MiddlewareNext
): Promise<void> {
  const token = req.cookies.token;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (token === "" || token === undefined) {
    throw new HttpException(HttpStatusCode.Unauthorized);
  }

  try {
    req.branchContext = await Session.branchSession.read(token, true);

    return;
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(HttpStatusCode.Unauthorized);
  }
}

export function finishRes(
  response: Response,
  data?: Record<string, unknown>,
  code?: number,
  desc?: string,
  status?: number
): void {
  if (!isProduction) {
    response.header("Access-Control-Allow-Origin", "*");
  }

  response
    .status(status ?? 200)
    .json(isProduction
      ? { code: code ?? CommonCodes.SuccessCode, data: data ?? {} }
      : { code: code ?? CommonCodes.SuccessCode, desc: desc ?? CommonCodes.SuccessDesc, data: data ?? {} });
}

export function exportCsv(data: Record<string, unknown>[], res: Response): void {
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${Date.now()}.csv`
  );
  res.setHeader("Content-Type", "application/vnd.ms-excel");

  const readStream = new PassThrough();

  if (data.length === 0) {
    readStream.end();
    res.end();

    return;
  }

  readStream.pipe(res);

  // for UTF-8 With BOM
  readStream.write("\uFEFF");

  const header = "\"" + Object.keys(data[0]).join(`","`) + "\"\n";

  readStream.write(header);
  data.map((result) => {
    const row = "\"" + Object.values(result).join(`","`) + "\"\n";
    readStream.write(row);
  });
  readStream.end();
}

export async function parseContentByType(req: HyperRequest): Promise<Record<string, unknown> | null> {
  switch (req.header("content-type")) {
    case "application/json":
      return JSON.parse(await req.text()) as Record<string, unknown>;

    case "application/x-www-form-urlencoded":
      return await req.urlencoded();

    case "multipart/form-data":
      return (await formDataToObject(req));

    default:
      Logger.error(
        "unrecognized payment callback request method content-type",
        { contentType: req.header("content-type"), body: await req.text(), url: req.url }
      );

      return null;
  }
}
