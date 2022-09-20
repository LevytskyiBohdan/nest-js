import {
  Update,
  Ctx,
  Start,
  Help,
  On,
  Hears, Command
} from "nestjs-telegraf";
import { Context } from "telegraf";
import { TelegramClient } from "telegram";
import { StringSession } from 'telegram/sessions';
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserModel } from "../models/user.model";
import { ConfigEnum } from "../enums/config.enum";
import { User } from "../schemas/user.schema";

@Update()
export class TelegramUpdate {
  constructor(private usersModel: UserModel, private configService: ConfigService) {}

  private readonly logger = new Logger(TelegramUpdate.name);

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply('Welcome. Please enter your phone number in format - /number 380... ');
  }

  @Command('/message_me')
  async messageMe(@Ctx() ctx: Context) {
    try {
      const text = (ctx.update as any)?.message?.text?.replace(/\/message_me(| )/, '');
      const telegramUserID: number = Number((ctx.update as any)?.message?.from?.id);

      const user: User | null = await this.usersModel.findByTelegramUserID(telegramUserID);

      if(!user) {
        const message = 'User not found';
        this.logger.error(message);
        await ctx.reply(message);
        return message;
      }
      const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
      const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

      const client = new TelegramClient(new StringSession(user.telegramSession),TELEGRAM_API_ID,TELEGRAM_API_HASH,{});
      await client.connect();
      await client.sendMessage('me', { message: text });

    } catch (e) {
      this.logger.error(e);
      return e;
    }

    return 'Done'
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


