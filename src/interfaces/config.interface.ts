import { ConfigEnum } from "../enums/config.enum";

export interface IConfig {
  [ConfigEnum.TELEGRAM_TOKEN]: string;
  [ConfigEnum.DB_PASS]: string;
  [ConfigEnum.DB]: string;
  [ConfigEnum.TELEGRAM_API_ID]: number;
  [ConfigEnum.TELEGRAM_API_HASH]: string;
}