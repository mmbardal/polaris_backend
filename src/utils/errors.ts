import { isProduction } from "@/env_values";

export class DomainException extends Error {
  constructor(code: number, desc: string, data?: Record<string, unknown>) {
    super(desc);

    this.desc = desc;
    this.code = code;
    this.data = data;
  }

  readonly desc: string;
  readonly code: number;
  readonly data: Record<string, unknown> | undefined;

  toJSON(): Record<string, unknown> {
    return isProduction
      ? {
        code: this.code,
        data: this.data ?? {}
      }
      : {
        code: this.code,
        desc: this.desc,
        data: this.data ?? {}
      };
  }
}
