import { CommonCodes } from "./errors";
import Logger from "@/utils/logger";
import { DomainException } from "@/utils/errors";
import type { AdminPayload, BranchPayload, permissions } from "@/domain/types";
import type { Positions } from "@/data/models";
import { comboRegexGenerator } from "@/schema/panel_schema";
import { dateRegex, homeNumberRegex, nationalCodeRegex, numbers, phoneNumberRegex } from "@/constants";

export function sanitizePageSize(pageSize: number): number {
  return Math.min(pageSize, 100);
}

export function generateRandomNumber(digits: number): number {
  if (digits <= 0) {
    throw new Error("Number of digits must be greater than 0.");
  }

  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function termToNumber(year: number, term: "1" | "2"): number {
  return year * 10 + Number(term);
}

export function isNumeric(value: string): boolean {
  return (/^\d+(\.\d+)?$/).test(value);
}

export function DomainExceptionUnexpectedData(error: unknown): never {
  // todo: check error message
  Logger.error("UnexpectedData!", error);
  throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
}

export function numberToTerm(n: number): { year: number; term: "1" | "2" } {
  const year = Math.floor(n / 10);
  const term = String(n % 10) as "1" | "2";

  return { year, term };
}

export function validateNoSpaces(title: string | null) {
  if (title !== null) {
    const trimmed = title.trim();

    if (trimmed.includes("  ")) {
      throw new DomainException(
        CommonCodes.UnexpectedDataCode,
        CommonCodes.UnexpectedDataDesc
      );
    }
  }
}

export function hasPermission(
  admin: AdminPayload,
  permission: permissions
): void {
  const value = admin.permissions;

  if (!value.includes(permission)) {
    throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
  }
}

export function hasRole(
  admin: AdminPayload | BranchPayload,
  role: Positions["level"] | "user" | "supervisor"
): void {
  if (admin.level !== role) {
    throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
  }
}

export function getMyAction(approval_level: number, adminContext: AdminPayload): { myAction: boolean } {
  const roleApprovalMap = {
    boss: 3,
    deputy: 2,
    manager: 1,
    expert: 0,
    supervisor: 10,
    user: 11
  };

  const expectedLevel = roleApprovalMap[adminContext.level];

  return {
    myAction: approval_level === expectedLevel
  };
}

interface itemType {
  regex: string;
  comboBoxValues?: string[] | undefined;
  model: "comboBox" | "phoneNumber" | "homeNumber" | "nationalCode" | "decimal" | "anyThings" | "date";
  nullable: boolean;
  name: string;
}

interface oldType {
  regex: string;
  comboBoxValues: string[];
  model: "comboBox" | "phoneNumber" | "homeNumber" | "nationalCode" | "decimal" | "anyThings" | "date";
  nullable: boolean;
  name: string;
}

export function regexGenerator(item: itemType) {
  if (item.model !== "comboBox" && item.comboBoxValues !== undefined) {
    throw new DomainException(CommonCodes.NoAccessCode, CommonCodes.NoAccessDesc);
  }

  if (item.model === "comboBox") {
    const combo = item.comboBoxValues;

    return comboRegexGenerator(combo);
  }

  switch (item.model) {
    case "phoneNumber": {
      return phoneNumberRegex;
    }

    case "homeNumber": {
      return homeNumberRegex;
    }

    case "nationalCode": {
      return nationalCodeRegex;
    }

    case "decimal": {
      return numbers;
    }

    case "anyThings": {
      return "";
    }

    case "date": {
      return dateRegex;
    }

  // No default
  }
}

export function isMissingInNew(old: oldType[], cleanedItems: itemType[]) {
  let missing = false;

  for (const oldObj of old) {
    let foundThisOldObjInNewList = false;

    for (const newObj of cleanedItems) {
      let currentOldAndNewAreIdentical = true;

      if (
        oldObj.name !== newObj.name
        || oldObj.model !== newObj.model
        || oldObj.nullable !== newObj.nullable
        || oldObj.regex !== newObj.regex
      ) {
        currentOldAndNewAreIdentical = false;
      } else {
        if (newObj.comboBoxValues !== undefined) {
          if (oldObj.comboBoxValues.length !== newObj.comboBoxValues.length) {
            currentOldAndNewAreIdentical = false;
          } else {
            for (let k = 0; k < oldObj.comboBoxValues.length; k++) {
              if (oldObj.comboBoxValues[k] !== newObj.comboBoxValues[k]) {
                currentOldAndNewAreIdentical = false;
                break;
              }
            }
          }
        }
      }

      if (currentOldAndNewAreIdentical) {
        foundThisOldObjInNewList = true;
        break;
      }
    }

    if (!foundThisOldObjInNewList) {
      missing = true;
      break;
    }
  }

  if (missing) {
    throw new DomainException(CommonCodes.UnexpectedDataCode, CommonCodes.UnexpectedDataDesc);
  }
}

export function formatCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const stringValue = String(value);

  if ((/[",\n]/).test(stringValue)) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }

  return stringValue;
}
