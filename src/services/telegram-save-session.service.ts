import {
  Update,
  Command
} from "nestjs-telegraf";
import { Context } from "telegraf";
import PhoneNumber from "awesome-phonenumber";
import { TelegramClient } from "telegram";
import { StringSession } from 'telegram/sessions';
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserModel } from "../models/user.model";
import { ConfigEnum } from "../enums/config.enum";

const stringSession = new StringSession('');


@Update()
export class TelegramSaveSessionService {
  constructor(private usersModel: UserModel, private configService: ConfigService) {}

  private readonly mapper = new Map<number, string>();
  private readonly logger = new Logger(TelegramSaveSessionService.name);

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

  @Command('/number')
  async number(ctx: Context) {
    const number = (ctx.update as any)?.message?.text?.replace(/\/number(| )/, '');
    const telegramUserID: number = Number((ctx.update as any)?.message?.from?.id);
    const phoneNumber = new PhoneNumber(number);

    await ctx.reply('After you get a code please enter in format /code 1-2-3-4-5. For example if your code is 12345 you should enter /code 1-2-3-4-5');
    if (phoneNumber.isValid()) {
      await ctx.reply(await this.saveSession(telegramUserID, phoneNumber, telegramUserID));
    }
  }

  @Command('/code')
  async codeCommand(ctx: Context) {
    const text = (ctx.update as any)?.message?.text?.replace(/\/code(| )/, '').replaceAll(/-/gi, '');
    const telegramUserID: number = Number((ctx.update as any)?.message?.from?.id);
    const code = text.slice(-5);

    await ctx.reply(await this.setCode(telegramUserID, code));
  }

  public async saveSession(identifier: number, phoneNumber: PhoneNumber, telegramUserID: number): Promise<string> {
    try {

      const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
      const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

      const client = new TelegramClient(
        stringSession,
        TELEGRAM_API_ID,
        TELEGRAM_API_HASH,
        {
          connectionRetries: 5,
        });

      await client.connect();

      client.start({
        phoneNumber: async () => phoneNumber.getNumber(),
        phoneCode: async () => await this.getCode(identifier),
        onError: (err: Error) => this.logger.error(err)
      })
        .then(async res => {
          const telegramSession = client.session.save() as unknown;
          this.logger.log(`Adding number ${phoneNumber.getNumber()} to our db with session: ${telegramSession}`);

          await this.usersModel.saveUserSession({
            number: phoneNumber.getNumber(),
            telegramSession: telegramSession as string,
            telegramUserID
          });
        });

      return 'Waiting for code...';

    } catch (e) {
      this.logger.error(e);
      return'Something went wrong...';
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
      return  'Code is setuped. Wait for login.';
    } catch (e) {
      this.logger.error(e);
      return'Something went wrong...';
    }
  }

}


