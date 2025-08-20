import type { AccessMode, ControlledTransaction, IsolationLevel, Kysely } from "kysely";
import { mysqlConn } from "@/data/mysql";
import type { DB } from "@/data/models";

import { Polaris } from "@/domain/polaris";

export type KyselyDB = Kysely<DB> | ControlledTransaction<DB>;

type ControlledTransactionNT<T> = Omit<ControlledTransaction<T>, "transaction" | "startTransaction" | "isTransaction" | "commit" | "rollback">;
type KyselyNT<T> = Omit<Kysely<T>, "transaction" | "startTransaction" | "isTransaction">;

export type KyselyNoTrans = ControlledTransactionNT<DB> | KyselyNT<DB>;

interface TransactionOptions {
  accessMode?: AccessMode;
  isolationLevel?: IsolationLevel;
}

type TransactionFn<T> = (domain: DomainManager) => Promise<T>;

class DomainManager {
  constructor(db?: KyselyDB) {
    this._db = db ?? mysqlConn;

    this.polaris = new Polaris(this);
  }

  private readonly _db: KyselyDB;
  readonly polaris: Polaris;

  /**
   * Checks if the current database connection is a transaction
   * @returns True if the current database connection is a transaction, false otherwise
   */
  get isInTransaction(): boolean {
    return this._db.isTransaction;
  }

  /**
   * Gets the current database connection
   * @returns The current database connection (either a transaction or the main connection)
   */
  get db(): KyselyNoTrans {
    return this._db;
  }

  transaction<T>(options: TransactionOptions, fn: TransactionFn<T>): Promise<T>;
  transaction<T>(fn: TransactionFn<T>): Promise<T>;

  /**
     * Executes a function within a transaction. If the function throws an error, the transaction is rolled back.
     * @param options - Transaction options (optional)
     * @param fn - The function to execute within the transaction
     * @returns The result of the function
     */
  async transaction<T>(options: TransactionOptions | TransactionFn<T>, fn?: TransactionFn<T>): Promise<T> {
    if (typeof options === "function") {
      fn = options;
      options = {};
    }

    // If we're already in a transaction, use it
    if (this.isInTransaction) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return await fn!(this);
    }

    // Otherwise, create a new transaction
    const trxRaw = this._db.startTransaction();

    if (options.accessMode !== undefined) {
      trxRaw.setAccessMode(options.accessMode);
    }

    if (options.isolationLevel !== undefined) {
      trxRaw.setIsolationLevel(options.isolationLevel);
    }

    const trx = await trxRaw.execute();
    const trxDomain = new DomainManager(trx);

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const res = await fn!(trxDomain);
      await trx.commit().execute();

      return res;
    } catch (error) {
      await trx.rollback().execute();
      throw error;
    }
  }
}

export const Domain = new DomainManager();

export type DomainManagerType = typeof Domain;
