import type { DomainManagerType } from "@/domain/index";
import type {
  TGetDashboardStats,
  TGetMapData,
  TGetLogs,
  TCreateTestConfig,
  TUpdateTestConfig,
  TDeleteTestConfig,
  TSubmitLogs
} from "@/schema/polaris_schema";

export class Polaris {
  constructor(domain: DomainManagerType) {
    this.domain = domain;
  }

  private readonly domain: DomainManagerType;

  /**
     * Retrieves aggregated statistics for the main dashboard.
     */

  async saveLogs(entity: TSubmitLogs) {
    await this.domain.transaction(async (trx) => {
      // Find or create device logic (remains the same)

      // Prepare log entries with all the new fields
      const logsToInsert = entity.logs.map((log) => ({
        device_id: 1,
        timestamp: new Date(log.timestamp),
        latitude: log.latitude,
        longitude: log.longitude,
        network_type: log.networkType,
        plmn_id: log.plmnId,
        tac: log.tac,
        cell_id: log.cellId,
        rsrp: log.rsrp,
        rsrq: log.rsrq,

        // --- ADDED FIELDS ---
        rscp: log.rscp,
        ecno: log.ecno,
        rxlev: log.rxlev,
        arfcn: log.arfcn,
        band: log.band
      }));

      if (logsToInsert.length > 0) {
        await trx.db
          .insertInto("network_logs")
          .values(logsToInsert)
          .execute();
      }
    });
  }

  async getDashboardStats(entity: TGetDashboardStats) {
    let query = this.domain.db.selectFrom("network_logs");

    if (entity.startDate !== undefined) {
      query = query.where("timestamp", ">=", new Date(entity.startDate));
    }

    if (entity.endDate !== undefined) {
      query = query.where("timestamp", "<=", new Date(entity.endDate));
    }

    const totalLogs = await query.select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow();
    const avgRsrp = await query.select(({ fn }) => fn.avg("rsrp").as("average")).executeTakeFirstOrThrow();
    const avgRsrq = await query.select(({ fn }) => fn.avg("rsrq").as("average")).executeTakeFirstOrThrow();

    return {
      totalLogs: Number(totalLogs.count),
      averageRsrp: avgRsrp.average,
      averageRsrq: avgRsrq.average
    };
  }

  /**
     * Retrieves data points for display on the map.
     */
  async getMapData(entity: TGetMapData) {
    let query = this.domain.db
      .selectFrom("network_logs")
      .selectAll();

    if (entity.startDate !== undefined) {
      query = query.where("timestamp", ">=", new Date(entity.startDate));
    }

    if (entity.endDate !== undefined) {
      query = query.where("timestamp", "<=", new Date(entity.endDate));
    }

    if (entity.networkType !== undefined) {
      query = query.where("network_type", "=", entity.networkType);
    }

    // Filter out logs without location data
    query = query.where("latitude", "is not", null).where("longitude", "is not", null);

    return await query.limit(5000).execute();
  }

  /**
     * Fetches a paginated list of logs with filtering and sorting.
     */
  async getLogs(entity: TGetLogs) {
    let query = this.domain.db.selectFrom("network_logs");

    if (entity.startDate !== undefined) {
      query = query.where("timestamp", ">=", new Date(entity.startDate));
    }

    if (entity.endDate !== undefined) {
      query = query.where("timestamp", "<=", new Date(entity.endDate));
    }

    const totalItems = await query.select(({ fn }) => fn.countAll().as("count")).executeTakeFirstOrThrow();

    const result = await query
      .selectAll()
      .limit(entity.limit)
      .offset(entity.offset)
      .execute();

    return { totalItems: Number(totalItems.count), result };
  }

  /**
     * Creates a new test configuration.
     */
  async createTestConfig(entity: TCreateTestConfig) {
    return await this.domain.db
      .insertInto("test_configs")
      .values({
        test_type: entity.testType,
        target: entity.target,
        interval_seconds: entity.intervalSeconds,
        is_enabled: entity.isEnabled === false ? 0 : 1
      })
      .returning("id")
      .executeTakeFirstOrThrow();
  }

  /**
     * Updates an existing test configuration.
     */
  async updateTestConfig(entity: TUpdateTestConfig) {
    const { configId, ...updateData } = entity;

    return await this.domain.db
      .updateTable("test_configs")
      .set({
        ...updateData,
        is_enabled: updateData.isEnabled === undefined ? undefined : (updateData.isEnabled ? 1 : 0)
      })
      .where("id", "=", configId)
      .execute();
  }

  /**
     * Deletes a test configuration.
     */
  async deleteTestConfig(entity: TDeleteTestConfig) {
    return await this.domain.db
      .deleteFrom("test_configs")
      .where("id", "=", entity.configId)
      .execute();
  }
}
