import { Agent as HttpsAgent } from "node:https";
import { Agent as HttpAgent } from "node:http";
import axios from "axios";
import type { CreateAxiosDefaults, AxiosInstance } from "axios";
import logger from "@/utils/logger";
import { isProduction, smsAuthHeader, smsEnable, smsSender } from "@/env_values";

const axiosOptions: CreateAxiosDefaults = isProduction
  ? {
    baseURL: "https://sms.magfa.com/api/http/sms/v2/",
    maxRedirects: 0,
    timeout: 2000,
    httpsAgent: new HttpsAgent({ rejectUnauthorized: true, keepAlive: true }),
    httpAgent: new HttpAgent({ keepAlive: true }),
    headers: {
      "User-Agent": "Paratco-MagFa-Client/1.1.0",
      "Content-Type": "application/json",
      Authorization: `Basic ${smsAuthHeader}`
    }
  }
  : {
    baseURL: "https://sms.magfa.com/api/http/sms/v2/",
    maxRedirects: 0,
    timeout: 2000,

    /*
     *  enable it for debugging connection to mellat gateway
     * proxy: { protocol: "https", host: "127.0.0.1", port: 8000 },
     */
    httpsAgent: new HttpsAgent({ rejectUnauthorized: false, keepAlive: true }),
    httpAgent: new HttpAgent({ keepAlive: true }),
    headers: {
      "User-Agent": "Paratco-MagFa-Client/1.1.0",
      "Content-Type": "application/json",
      Authorization: `Basic ${smsAuthHeader}`
    }
  };

const magfaErrors = {
  1: "شماره گیرنده نادرست است",
  2: "شماره فرستنده نادرست است",
  3: "پارامتر encoding نامعتبر است. (بررسی صحت و هم‌خوانی متن پیامک با encoding انتخابی)",
  4: "پارامتر mclass نامعتبر است",
  6: "پارامتر UDH نامعتبر است",
  13: "محتویات پیامک (ترکیب UDH و متن) خالی است. (بررسی دوباره‌ی متن پیامک و پارامتر UDH)",
  14: "مانده اعتبار ریالی مورد نیاز برای ارسال پیامک کافی نیست",
  15: "سرور در هنگام ارسال پیام مشغول برطرف نمودن ایراد داخلی بوده است. (ارسال مجدد درخواست)",
  16: "حساب غیرفعال است. (تماس با واحد فروش سیستم‌های ارتباطی)",
  17: "حساب منقضی شده است. (تماس با واحد فروش سیستم‌های ارتباطی)",
  18: "نام کاربری و یا کلمه عبور نامعتبر است. (بررسی مجدد نام کاربری و کلمه عبور)",
  19: "درخواست معتبر نیست. (ترکیب نام کاربری، رمز عبور و دامنه اشتباه است. تماس با واحد فروش برای دریافت کلمه عبور جدید)",
  20: "شماره فرستنده به حساب تعلق ندارد",
  22: "این سرویس برای حساب فعال نشده است",
  23: "در حال حاضر امکان پردازش درخواست جدید وجود ندارد، لطفا دوباره سعی کنید. (ارسال مجدد درخواست)",
  24: "شناسه پیامک معتبر نیست. (ممکن است شناسه پیامک اشتباه و یا متعلق به پیامکی باشد که بیش از یک روز از ارسال آن گذشته)",
  25: "نام متد درخواستی معتبر نیست. (بررسی نگارش نام متد با توجه به بخش متدها در این راهنما)",
  27: "شماره گیرنده در لیست سیاه اپراتور قرار دارد. (ارسال پیامک‌های تبلیغاتی برای این شماره امکان‌پذیر نیست)",
  28: "شماره گیرنده، بر اساس پیش‌شماره در حال حاضر در مگفا مسدود است",
  29: "آدرس IP مبدا، اجازه دسترسی به این سرویس را ندارد",
  30: "تعداد بخش‌های پیامک بیش از حد مجاز استاندارد (۲۶۵ عدد) است",
  31: "داده‌های موردنیاز برای ارسال کافی نیستند. (اصلاح HTTP Request)",
  101: "طول آرایه پارامتر messageBodies با طول آرایه گیرندگان تطابق ندارد",
  102: "طول آرایه پارامتر messageClass با طول آرایه گیرندگان تطابق ندارد",
  103: "طول آرایه پارامتر senderNumbers با طول آرایه گیرندگان تطابق ندارد",
  104: "طول آرایه پارامتر udhs با طول آرایه گیرندگان تطابق ندارد",
  105: "طول آرایه پارامتر priorities با طول آرایه گیرندگان تطابق ندارد",
  106: "آرایه‌ی گیرندگان خالی است",
  107: "طول آرایه پارامتر گیرندگان بیشتر از طول مجاز است",
  108: "آرایه‌ی فرستندگان خالی است",
  109: "طول آرایه پارامتر encoding با طول آرایه گیرندگان تطابق ندارد",
  110: "طول آرایه پارامتر checkingMessageIds با طول آرایه گیرندگان تطابق ندارد"
} as const;

class MagFaError extends Error {
  constructor(code: keyof typeof magfaErrors) {
    super();
    this.code = code;
    this.message = magfaErrors[code];
    this.name = "MagFaError";
  }

  message: string;
  code: number;
}

interface MagFaBase {
  status: keyof typeof magfaErrors | 0;
}

interface BalanceResponse extends MagFaBase {
  balance: number;
}

export class SMS {
  private constructor() {
    this.client = axios.create(axiosOptions);
  }

  static readonly instance: SMS = new SMS();
  private readonly client: AxiosInstance;

  static get isEnable(): boolean {
    return smsEnable && smsAuthHeader !== undefined;
  }

  async send(mobile: string[] | string, message: string, silence = true): Promise<void> {
    if (!smsEnable || smsAuthHeader === undefined) {
      return;
    }

    const data = { senders: [smsSender], messages: [message], recipients: typeof mobile === "string" ? [mobile] : mobile };

    try {
      // eslint-disable-next-line unicorn/no-await-expression-member
      const res = (await this.client.post("send", JSON.stringify(data))).data as MagFaBase;

      if (res.status !== 0) {
        throw new MagFaError(res.status);
      }
    } catch (error: unknown) {
      logger.warn("magfa(sms): failed to send sms", error, data);

      if (!silence) {
        throw error;
      }
    }
  }

  async balance(silence = true): Promise<number> {
    if (!smsEnable || smsAuthHeader === undefined) {
      return 0;
    }

    try {
      const result = await this.client.get("balance");
      const res = (result).data as BalanceResponse;

      if (res.status === 0) {
        return res.balance;
      }

      throw new MagFaError(res.status);
    } catch (error: unknown) {
      logger.warn("magfa(sms): failed to get balance", error);

      if (!silence) {
        throw error;
      }
    }

    return 0;
  }
}
