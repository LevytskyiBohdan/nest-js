import {
  Update,
  Ctx,
  Start,
  Help,
  On,
  Hears, Command
} from "nestjs-telegraf";
import { Context } from "telegraf";
import PhoneNumber from "awesome-phonenumber";
import { TelegramClient } from "telegram";
import { StringSession } from 'telegram/sessions';
import { Logger } from "@nestjs/common";
import { log } from "util";
import { ConfigService } from "@nestjs/config";
import { UsersModel } from "../models/user.model";
import { ConfigEnum } from "../enums/config.enum";

const stringSession = new StringSession('');


@Update()
export class TelegramUpdate {
  constructor(private usersModel: UsersModel, private configService: ConfigService) {}

  private readonly mapper = new Map<number, string>();
  private readonly logger = new Logger(TelegramUpdate.name);

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

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply('Welcome. Please enter your phone number in format - /number 380... ');
  }

  @Command('/save_message')
  async command(@Ctx() ctx: Context) {
    await ctx.reply('123');
  }

  @Command('/number')
  async number(ctx: Context) {
    try {
      const number = (ctx.update as any)?.message?.text?.replace(/\/number(| )/, '');
      const userTelegramID: number = (ctx.update as any)?.message?.from?.id;
      const phoneNumber = new PhoneNumber(number);

      await ctx.reply('After you get a code please enter in format /code 123...');
      if (phoneNumber.isValid()) {
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
          phoneNumber: async () => number,
          phoneCode: async () => await this.getCode(userTelegramID),
          onError: (err: Error) => this.logger.error(err)
        })
          .then(async res => {
            console.log(res, 'res>>>');
            const telegramSession = client.session.save() as unknown;
            this.logger.log(`Adding number ${phoneNumber.getNumber()} to our db with session: ${telegramSession}`);
            console.log('`Adding number ${phoneNumber.getNumber()} to our db with session: ${telegramSession}`');
            await this.usersModel.saveUserSession({name: 'Bohdan', number: phoneNumber.getNumber(), telegramSession: telegramSession as string});
            // await this.userModel.create({ phoneNumber: phoneNumber.getNumber(), telegramSession });
          });

      }
    } catch (e) {
      this.logger.error(e);
      await ctx.reply('Something went wrong...');
    }
  }

  @Command('/code')
  async codeCommand(ctx: Context) {
    try {
      const text = (ctx.update as any)?.message?.text?.replace(/\/code(| )/, '');
      const userTelegramID: number = (ctx.update as any)?.message?.from?.id;
      const code = text.slice(-5);
      if (!userTelegramID) {
        await ctx.reply('Wrong userTelegramID');
        return;
      }
      if (!code) {
        await ctx.reply('Wrong code');
        return;
      }
      this.mapper.set(userTelegramID, code);
      await ctx.reply('Done');
    } catch (e) {
      this.logger.error(e);
      await ctx.reply('Something went wrong...');
    }
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply('Send me a sticker');
  }

  @On('sticker')
  async on(@Ctx() ctx: Context) {
    await ctx.reply('👍');
  }

  @Hears('hi')
  async hears(@Ctx() ctx: Context) {
    await ctx.reply('Hey there');
  }


}


