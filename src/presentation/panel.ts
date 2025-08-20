import type { Request, Response, Server } from "hyper-express";
import { finishRes, validateJson } from "@/presentation/helpers";
import { Domain } from "@/domain";
import {
  submitLogsS,
  getLogsS,
  getDashboardStatsS,
  getMapDataS,
  createTestConfigS,
  updateTestConfigS,
  deleteTestConfigS
} from "@/schema/polaris_schema";
import { authMiddleware, roleMiddleware } from "@/presentation/authMiddleware";

// =================================================================
// == Routes for the Android Client (Data Ingestion)
// =================================================================

/**
 * @route POST /client/submitLogs
 * @description Receives a batch of network and location logs from an Android client.
 */
async function submitLogs(req: Request, res: Response): Promise<void> {
  // The body will be an array of log objects from the client's local DB
  const body = await validateJson(req, submitLogsS);

  // The domain layer handles saving these logs to the main database
  console.log(body);
  await Domain.polaris.saveLogs(body); // Assuming deviceContext has deviceId, etc.

  // Acknowledge receipt of the data
  finishRes(res, { message: "Logs received successfully." });
}

// =================================================================
// == Routes for the React Web Panel (Data Retrieval & Management)
// =================================================================

/**
 * @route POST /panel/dashboardStats
 * @description Gets aggregated statistics for the main dashboard view.
 */
async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, getDashboardStatsS); // Body might contain date ranges

  const result = await Domain.polaris.getDashboardStats(body);

  finishRes(res, { result });
}

/**
 * @route POST /panel/mapData
 * @description Retrieves log data formatted for display on a map.
 */
async function getMapData(req: Request, res: Response): Promise<void> {
  // Body will contain filters like date range, network type, signal strength thresholds, etc.
  const body = await validateJson(req, getMapDataS);

  const result = await Domain.polaris.getMapData(body);

  finishRes(res, result);
}

/**
 * @route POST /panel/logsTable
 * @description Fetches a paginated list of all logs for display in a table.
 */
async function getLogsTable(req: Request, res: Response): Promise<void> {
  // Body will contain filters, sorting, and pagination options
  const body = await validateJson(req, getLogsS);

  const result = await Domain.polaris.getLogs(body);

  finishRes(res, result);
}

/**
 * @route POST /panel/createTestConfig
 * @description Allows an admin to define a new test for clients to run.
 */
async function createTestConfig(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, createTestConfigS);

  await Domain.polaris.createTestConfig(body);

  finishRes(res, { message: "Test configuration created." });
}

/**
 * @route POST /panel/updateTestConfig
 * @description Updates an existing test configuration.
 */
async function updateTestConfig(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, updateTestConfigS);

  await Domain.polaris.updateTestConfig(body);

  finishRes(res, { message: "Test configuration updated." });
}

/**
 * @route POST /panel/deleteTestConfig
 * @description Deletes a test configuration.
 */
async function deleteTestConfig(req: Request, res: Response): Promise<void> {
  const body = await validateJson(req, deleteTestConfigS);

  await Domain.polaris.deleteTestConfig(body);

  finishRes(res, { message: "Test configuration deleted." });
}

async function getTestConfigs(_: Request, res: Response): Promise<void> {
  // This route doesn't need to validate a body
  const result = await Domain.polaris.getTestConfigs();
  finishRes(res, { result });
}

// =================================================================
// == Route Registration
// =================================================================

export default function routes(server: Server, prefix: string): void {
  // Client Routes
  server.use(prefix + "/panel", authMiddleware);

  server.post(prefix + "/submitLogs", submitLogs);

  // Panel Routes
  server.post(prefix + "/getTestConfigs", getTestConfigs);

  server.post(prefix + "/dashboardStats", getDashboardStats);
  server.post(prefix + "/mapData", getMapData);
  server.post(prefix + "/logsTable", getLogsTable);
  server.post(prefix + "/createTestConfig", createTestConfig, roleMiddleware("admin"));
  server.post(prefix + "/updateTestConfig", updateTestConfig, roleMiddleware("admin"));
  server.post(prefix + "/deleteTestConfig", deleteTestConfig, roleMiddleware("admin"));
}
