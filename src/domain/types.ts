export const RuleTypesList = ["min_max"];

export type permissions = "groupEditing" | "userEditing" | "tablePermission" | "tableCreate" | "superUserEditor";

export interface AdminPayload {
  active: boolean;
  first_name: string;
  id: number;
  positionId: number;
  last_name: string;
  mobileNumber: string;
  positionName: string | null;
  level: "boss" | "deputy" | "manager" | "expert" | "user" | "supervisor";
  permissions: permissions[];
}

export interface ErrorMessage {
  col: string;
  error: string;
  index?: number;
}

export interface TroubledError {
  messages: ErrorMessage[];
  index: number;
}

export interface BulkInsertResponse {
  success: boolean;
  errors: {
    troubled: TroubledError[];
  };
}

export interface BranchPayload {
  active: boolean;
  first_name: string;
  last_name: string;
  id: number;
  mobileNumber: string;
  positionName: string;
  positionId: number;
  level: "boss" | "deputy" | "manager" | "expert" | "user" | "supervisor";
}

export const MySQLErrorCodes = {
  // Access denied for user
  ER_ACCESS_DENIED_ERROR: "ER_ACCESS_DENIED_ERROR",

  // Unknown database
  ER_BAD_DB_ERROR: "ER_BAD_DB_ERROR",

  // Table doesn't exist
  ER_NO_SUCH_TABLE: "ER_NO_SUCH_TABLE",

  // Query syntax error
  ER_PARSE_ERROR: "ER_PARSE_ERROR",

  // Duplicate entry for a key
  ER_DUP_ENTRY: "ER_DUP_ENTRY",

  // Unknown column in the field list
  ER_BAD_FIELD_ERROR: "ER_BAD_FIELD_ERROR",

  // Cannot delete/update due to foreign key constraint
  ER_ROW_IS_REFERENCED: "ER_ROW_IS_REFERENCED",

  // Cannot delete/update (secondary foreign key issue)
  ER_ROW_IS_REFERENCED_2: "ER_ROW_IS_REFERENCED_2",

  // Cannot add foreign key constraint
  ER_CANNOT_ADD_FOREIGN: "ER_CANNOT_ADD_FOREIGN",

  // Data too long for column
  ER_DATA_TOO_LONG: "ER_DATA_TOO_LONG",

  // Field doesn't have a default value
  ER_NO_DEFAULT_FOR_FIELD: "ER_NO_DEFAULT_FOR_FIELD",

  // Key does not exist in table
  ER_KEY_NOT_FOUND: "ER_KEY_NOT_FOUND",

  // Lock wait timeout exceeded
  ER_LOCK_WAIT_TIMEOUT: "ER_LOCK_WAIT_TIMEOUT",

  // Deadlock found when trying to get a lock
  ER_LOCK_DEADLOCK: "ER_LOCK_DEADLOCK",

  // Too many connections
  ER_TOO_MANY_CONNECTIONS: "ER_TOO_MANY_CONNECTIONS",

  // Host not allowed to connect
  ER_HOST_NOT_PRIVILEGED: "ER_HOST_NOT_PRIVILEGED",

  // Nonaggregated column in GROUP BY
  ER_WRONG_FIELD_WITH_GROUP: "ER_WRONG_FIELD_WITH_GROUP",

  // Unknown character set
  ER_UNKNOWN_CHARACTER_SET: "ER_UNKNOWN_CHARACTER_SET",

  // Stored procedure does not exist
  ER_SP_DOES_NOT_EXIST: "ER_SP_DOES_NOT_EXIST",

  // Connection was lost
  PROTOCOL_CONNECTION_LOST: "PROTOCOL_CONNECTION_LOST",

  // Connection count error
  ER_CON_COUNT_ERROR: "ER_CON_COUNT_ERROR",

  // Query execution was interrupted
  ER_QUERY_INTERRUPTED: "ER_QUERY_INTERRUPTED",

  // Query timed out
  ETIMEDOUT: "ETIMEDOUT",

  ER_NO_REFERENCED_ROW_2: "ER_NO_REFERENCED_ROW_2"
} as const;
