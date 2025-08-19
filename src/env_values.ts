import { boolValue, intValue, stringValue } from "@/utils/env";

export const isProduction = process.env.NODE_ENV === "production";

export const appName = stringValue("APP_NAME");

export const apiPrefix = "/api/v1";

export const isTest = process.env.NODE_ENV === "test";

export const isDevelopment = process.env.NODE_ENV === "development";

export const httpHost = stringValue("HTTP_HOST");

export const httpPort = intValue("HTTP_PORT");

export const sessionTTL = intValue("SESSION_TTL");

export const maxSessionTTL = intValue("MAX_SESSION_TTL");

export const mysqlHosts = stringValue("MYSQL_HOSTS");

export const mysqlPort = intValue("MYSQL_PORT");

export const mysqlUser = stringValue("MYSQL_USERNAME");

export const mysqlPass = stringValue("MYSQL_PASSWORD");

export const mysqlDatabase = stringValue("MYSQL_DATABASE");

export const captchaPrivateKey: string = stringValue("CAPTCHA_PRIVATE_KEY");

export const captchaPublicKey: string = stringValue("CAPTCHA_PUBLIC_KEY");

export const captchaExpireTime: number = intValue("CAPTCHA_EXPIRE_TIME");

export const redisHost = stringValue("REDIS_HOST");

export const redisPort = intValue("REDIS_PORT");

export const redisDb = intValue("REDIS_DB");

export const otpExpirationSeconds: number = intValue("OTP_EXPIRATION_SECONDS");

const smsUser = stringValue("SMS_USER", "");

const smsDomain = stringValue("SMS_DOMAIN", "");

const smsPassword = stringValue("SMS_PASS", "");

export const smsEnable = boolValue("SMS_ENABLE", false);

export const smsSender = stringValue("SMS_SENDER", "");

export const smsAuthHeader = smsUser === "" || smsDomain === "" || smsPassword === "" || smsSender === ""
  ? undefined
  : btoa(`${smsUser}/${smsDomain}:${smsPassword}`);

export const selfUrl: string = isProduction ? stringValue("SELF_URL") : `${stringValue("SELF_URL")}:${httpPort}`;
