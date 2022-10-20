import { Command, Update } from 'nestjs-telegraf';
import PhoneNumber from 'awesome-phonenumber';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';
import { Context } from 'telegraf';

const stringSession = new StringSession('');

@Update()
export class TelegramSaveSessionService {
  private readonly mapper = new Map<number, string>();
  private readonly passwords = new Map<number, string>();
  private readonly logger = new Logger(TelegramSaveSessionService.name);

  constructor(private usersModel: UserModel, private configService: ConfigService) {}

  @Command('/number')
  async number(ctx: Context) {
    const number = (ctx.update as any)?.message?.text?.replace(/\/number(| )/, '');
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);
    const phoneNumber = new PhoneNumber(number);

    try {
      if (phoneNumber.isValid()) {
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
            phoneCode: async () => await this.getCode(telegramUserID, ctx),
            password: async () => await this.getPassword(telegramUserID, ctx),
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
            await ctx.reply('You was logged in. Your session was saved.');
          });
      } else {
        const message = 'Phone number is invalid';

        this.logger.error(message);
        await ctx.reply(message);
      }
    } catch (e) {
      this.logger.error(e);
      await ctx.reply('Something went wrong...');
    }
  }

  @Command('/code')
  async codeCommand(ctx: Context) {
    const text = (ctx.update as any)?.message?.text?.replace(/\/code(| )/, '').replaceAll(/-/gi, '');
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);
    const code = text.slice(-5);

    this.mapper.set(telegramUserID, code);

    await ctx.reply('Great job man!');
  }

  @Command('/pass')
  async passwordCommand(ctx: Context) {
    const password = (ctx.update as any)?.message?.text?.replace(/\/pass(| )/, '').trim();
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);

    this.passwords.set(telegramUserID, password);

    await ctx.reply('Great job!');
  }

  private readonly getCode = async (number: number, ctx: Context) => {
    await ctx.reply(
      'Please provide your code in format - /code [1-2-3-4-5] ' +
        'For example if your code is 12345 you should enter /code 1-2-3-4-5',
    );

    return new Promise<string>((resolve, reject) => {
      const index = setInterval(() => {
        if (this.mapper.has(number)) {
          clearInterval(index);
          return resolve(this.mapper.get(number) as string);
        }
      }, 1000);
    });
  };

  private readonly getPassword = async (number: number, ctx: Context) => {
    await ctx.reply('Please provide your password in format - /pass [password]');

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
