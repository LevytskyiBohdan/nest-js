import { Update } from 'nestjs-telegraf';
import PhoneNumber from 'awesome-phonenumber';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';

const stringSession = new StringSession('');

@Update()
export class TelegramSaveSessionService {
  private readonly mapper = new Map<number, string>();
  private readonly passwords = new Map<number, string>();
  private readonly logger = new Logger(TelegramSaveSessionService.name);

  constructor(private usersModel: UserModel, private configService: ConfigService) {}

  public async saveSession(identifier: number, phoneNumber: PhoneNumber, telegramUserID: number): Promise<string> {
    try {
      const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
      const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

      const client = new TelegramClient(stringSession, TELEGRAM_API_ID, TELEGRAM_API_HASH, {
        appVersion: '2.12.8',
        deviceModel: 'PC',
        systemVersion: 'Windows_NT',
        connectionRetries: 5,
      });

      await client.connect();

      client
        .start({
          phoneNumber: async () => phoneNumber.getNumber(),
          phoneCode: async () => await this.getCode(identifier),
          password: async () => await this.getPassword(identifier),
          onError: (err: Error) => this.logger.error(err),
        })
        .then(async (res) => {
          const telegramSession = client.session.save() as unknown;
          this.logger.log(`Adding number ${phoneNumber.getNumber()} to our db with session: ${telegramSession}`);

          await this.usersModel.saveUserSession({
            number: phoneNumber.getNumber(),
            telegramSession: telegramSession as string,
            telegramUserID,
            isUse: true,
          });
        });

      return 'Waiting for code...';
    } catch (e) {
      this.logger.error(e);
      return 'Something went wrong...';
    }
  }

  public async setCode(identifier: number, code: string): Promise<string> {
    try {
      this.logger.warn(code);
      if (!identifier) {
        return 'Wrong identifier';
      }
      if (!code) {
        return 'Wrong code';
      }
      this.mapper.set(identifier, code);
      return 'Code is setuped. Wait for login.';
    } catch (e) {
      this.logger.error(e);
      return 'Something went wrong...';
    }
  }

  private readonly getCode = async (number: number) => {
    return new Promise<string>((resolve, reject) => {
      const index = setInterval(() => {
        if (this.mapper.has(number)) {
          clearInterval(index);
          return resolve(this.mapper.get(number) as string);
        }
      }, 1000);
    });
  };

  private readonly getPassword = async (number: number) => {
    return new Promise<string>((resolve, reject) => {
      const index = setInterval(() => {
        if (this.passwords.has(number)) {
          clearInterval(index);
          return resolve(this.passwords.get(number) as string);
        }
      }, 1000);
    });
  };
}
