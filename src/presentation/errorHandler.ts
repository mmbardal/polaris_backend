import type { Request, Response } from "hyper-express";
import { HttpStatusCode } from "axios";
import type { QueryError } from "mysql2";
import Logger from "@/utils/logger";
import { DomainException } from "@/utils/errors";
import { CommonCodes } from "@/domain/errors";
import { MySQLErrorCodes } from "@/domain/types";
import { finishRes, HttpException } from "@/presentation/helpers";
import { isProduction } from "@/env_values";
import { Session } from "@/data/session";

async function unauthorized(req: Request, res: Response): Promise<void> {
  try {
    if (typeof req.cookies.token !== "undefined") {
      await Session.adminSession.delete(req.cookies.token);
      res.cookie("token", null);
    }
  } catch {
    // ignore
  }

  res.status(HttpStatusCode.Unauthorized).send();
}

export function httpExceptionHandlerMiddleware(request: Request, response: Response, error: Error): void {
  if (error instanceof DomainException) {
    if (error.code < (CommonCodes.SuccessCode as number)) {
      switch (error.code) {
        case CommonCodes.NoAccessCode as number:
          void unauthorized(request, response);
          break;

        case CommonCodes.UnexpectedDataCode as number:
          response.status(HttpStatusCode.BadRequest).send();
          break;

        case CommonCodes.NotFoundDataCode as number:
          response.status(HttpStatusCode.NotFound).send();
          break;

        case CommonCodes.ActiveEntryExistCode as number:
          response.status(HttpStatusCode.BadRequest).send();
          break;

        default:
          throw new Error(`unimplemented code for status code: ${error.code}`);
      }
    } else {
      response.json(error);
    }
  } else if (error instanceof HttpException) {
    if (error.statusCode === HttpStatusCode.Unauthorized) {
      void unauthorized(request, response);
    } else {
      response.status(error.statusCode).send(!isProduction ? error.message : undefined);
    }
  } else {
    const mysqlError = error as QueryError;

    switch (mysqlError.code) {
      case MySQLErrorCodes.ER_DUP_ENTRY:
        finishRes(response, undefined, CommonCodes.DuplicateEntryCode, CommonCodes.DuplicateEntryDesc);
        break;

      case MySQLErrorCodes.ER_CANNOT_ADD_FOREIGN:

      case MySQLErrorCodes.ER_DATA_TOO_LONG:
        finishRes(response, undefined, CommonCodes.TooLongDataCode, CommonCodes.TooLongDataDesc);
        break;

      case MySQLErrorCodes.ER_NO_REFERENCED_ROW_2:
        response.status(HttpStatusCode.BadRequest).send();
        break;

      case MySQLErrorCodes.ER_ROW_IS_REFERENCED_2:
        finishRes(response, undefined, CommonCodes.hasReferenceCode, CommonCodes.hasReferenceDesc);
        break;

      default:
        finishRes(response, undefined, CommonCodes.internalCode, CommonCodes.internalDesc);
        Logger.errorTrace("internal server error", error);

        return;
    }
  }

  Logger.debug(error.message, { error });
}
