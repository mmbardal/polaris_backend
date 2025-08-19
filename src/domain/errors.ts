/* eslint-disable @typescript-eslint/no-mixed-enums */
export const enum CommonCodes {
  NotFoundDataCode = -3,
  NotFoundDataDesc = "notFound data",

  UnexpectedDataCode = -2,
  UnexpectedDataDesc = "unexpected data",

  invalidZipFileCode = 10,
  invalidZipFileDesc = " invalidZipFile",

  NoAccessCode = -1,
  NoAccessDesc = "no access operation",

  FlowDefectCode = 8,
  FlowDefectDesc = "flow for you is defected",
  SuccessCode = 0,
  SuccessDesc = "success",
  OtpExistsCode = 5,
  OtpExistsDesc = "Otp already exists",
  internalCode = 1,
  internalDesc = "internal error",
  WrongOtpCode = 4,
  WrongOtpDesc = "invalid otp",

  BadCaptchaCode = 2,
  BadCaptchaDesc = "wrong captcha",

  DuplicateEntryCode = 3,
  DuplicateEntryDesc = "duplicate entry",

  ActiveEntryExistCode = 12,
  ActiveEntryExistDesc = "Active table is exist",

  hasReferenceCode = 7,
  hasReferenceDesc = "this item has reference",

  TooLongDataCode = 13,
  TooLongDataDesc = "too long data",
  NotFinalizedTableCode = 15,
  NotFinalizedTableDesc = "table approve level is not 4",
  unprocessableEntitiesCode = 11,
  unprocessableEntitiesDesc = " unprocessable entities"
}

export const enum UserErrorCodes {
  WrongUsernamePasswordCode = 100,
  WrongUsernamePasswordDesc = "wrong username or password",

  DisableUserCode = 101,
  DisableUserDesc = "disable user"

}

export const enum BaseTuitionErrorCodes {
  SameItemExistsOnOppositePeriodTypeCode = 200,
  SameItemExistsOnOppositePeriodTypeDesc = "Same Item Exists On Opposite PeriodType"

}
