import {
  Update,
  Ctx,
  Start,
  Help,
  On,
  Hears, Command
} from "nestjs-telegraf";
import { Context } from "telegraf";
import { UsersModel } from "./models/user.model";
import PhoneNumber from "awesome-phonenumber";
import { TelegramClient } from "telegram";
import { StringSession } from 'telegram/sessions';
import { ConfigEnum } from "./enums/config.enum";
import { Logger } from "@nestjs/common";
import { log } from "util";
import { ConfigService } from "@nestjs/config";

const stringSession = new StringSession('');


@Update()
export class AppUpdate {
  constructor(private usersService: UsersModel, private configService: ConfigService) {

    console.log('111>>>>');
    // this.usersService.create({name: 'Bohdan', number: 380985297221}).then(res => console.log(res));
    // this.usersService.findAll().then(res => console.log(res));
    // this.usersService.findByNumber(380985297221).then(res => console.log(res));
    console.log('>>>>');
  }

  private readonly mapper = new Map<string, string>();
  private readonly logger = new Logger(AppUpdate.name);

  private readonly getCode = (number: string) => {
    return new Promise<string>((resolve, reject) => {
      const index = setInterval(() => {
        if (this.mapper.has(number)) {
          clearInterval(index);
          resolve(this.mapper.get(number) as string);
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
          await client
            .start({
              phoneNumber: async () => number,
              phoneCode: () => this.getCode(phoneNumber.getNumber()),
              onError: (err) => this.logger.error(err),
            })
            .then(async () => {
              const telegramSession = client.session.save() as unknown;
              this.logger.log(`Adding number ${phoneNumber.getNumber()} to our db with session: ${telegramSession}`);

              await this.usersService.saveUserSession({name: 'Bohdan', number: phoneNumber.getNumber(), telegramSession: telegramSession as string});
              // await this.userModel.create({ phoneNumber: phoneNumber.getNumber(), telegramSession });
            })

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
      const code = text.slice(-5);
      const phoneNumber = new PhoneNumber(text.replace(code, '').trim());
      if (!phoneNumber.isValid()) {
        await ctx.reply('Wrong phone number. Please enter your phone number in format - /number +380...');
        return;
      }
      if (!code) {
        await ctx.reply('Wrong code');
        return;
      }
      this.mapper.set(phoneNumber.getNumber(), code);
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


