import { Update, Ctx, Start, Help, On, Hears, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';
import { User } from '../schemas/user.schema';
import { TelegramSaveMessagesService } from './telegram-save-messages.service';
import { TelegramExcludeMessagesService } from './telegram-exclude-messages.service';
import PhoneNumber from 'awesome-phonenumber';
import { TelegramSaveSessionService } from './telegram-save-session.service';

@Update()
export class TelegramService implements OnApplicationBootstrap {
  constructor(
    private usersModel: UserModel,
    private configService: ConfigService,
    private telegramSaveMessagesService: TelegramSaveMessagesService,
    private telegramExcludeMessagesService: TelegramExcludeMessagesService,
    private telegramSaveSessionService: TelegramSaveSessionService,
  ) {}

  private readonly logger = new Logger(TelegramService.name);

  async onApplicationBootstrap() {
    // const user = await this.usersModel.findByNumber('+380985297221');
    // if (user && user.telegramUserID) {
    //   this.logger.error(await this.telegramSaveMessagesService.onStartListener(user.telegramUserID));
    // }
    for (const user of await this.usersModel.findAll()) {
      if (user.isUse) {
        this.logger.log(await this.telegramSaveMessagesService.onStartListener(user.telegramUserID));
      } else {
        this.logger.log(`Listener wasn't started for ${user.number}`);
      }
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply('Welcome. Please enter your phone number in format - /number 380... ');
  }

  @Command('/start_save')
  async startSave(ctx: Context) {
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);

    await ctx.reply(await this.telegramSaveMessagesService.onStartListener(telegramUserID));
  }

  @Command('/stop_save')
  async stopSave(ctx: Context) {
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);

    await ctx.reply(await this.telegramSaveMessagesService.onStopListener(telegramUserID));
  }

  @Command('/exclude')
  async exclude(ctx: Context) {
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);
    const telegramExcludeUserName = String((ctx.update as any)?.message?.text?.replace(/\/exclude /, ''));

    await ctx.reply(
      await this.telegramExcludeMessagesService.onExcludeMessages(telegramUserID, telegramExcludeUserName),
    );
  }

  @Command('/number')
  async number(ctx: Context) {
    const number = (ctx.update as any)?.message?.text?.replace(/\/number(| )/, '');
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);
    const phoneNumber = new PhoneNumber(number);

    await ctx.reply(
      // eslint-disable-next-line max-len
      'After you get a code please enter in format /code 1-2-3-4-5. For example if your code is 12345 you should enter /code 1-2-3-4-5',
    );
    if (phoneNumber.isValid()) {
      await ctx.reply(await this.telegramSaveSessionService.saveSession(telegramUserID, phoneNumber, telegramUserID));
    }
  }

  @Command('/code')
  async codeCommand(ctx: Context) {
    const text = (ctx.update as any)?.message?.text?.replace(/\/code(| )/, '').replaceAll(/-/gi, '');
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);
    const code = text.slice(-5);

    await ctx.reply(await this.telegramSaveSessionService.setCode(telegramUserID, code));
  }

  @Command('/message_me')
  async messageMe(@Ctx() ctx: Context) {
    try {
      const text = (ctx.update as any)?.message?.text?.replace(/\/message_me(| )/, '');
      const telegramUserID = Number((ctx.update as any)?.message?.from?.id);

      const user: User | null = await this.usersModel.findByTelegramUserID(telegramUserID);

      if (!user) {
        const message = 'User not found';
        this.logger.error(message);
        await ctx.reply(message);
        return message;
      }
      const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
      const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

      const client = new TelegramClient(
        new StringSession(user.telegramSession),
        TELEGRAM_API_ID,
        TELEGRAM_API_HASH,
        {},
      );
      await client.connect();
      await client.sendMessage('me', { message: text });
    } catch (e) {
      this.logger.error(e);
      return e;
    }

    return 'Done';
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    const message = `
    Commands:
    
    /start - use this command for starting initiate bot
    
    /number - use this command for enter your phone number and start to work. 
    Example: /number +380...
    
    /code - use this command to provide verification code in format 1-2-3-4-5 from Telegram. 
    Example: /code 1-2-3-4-5
    
    /start_save - use this command for starting to save your messages
    
    /stop_save - use this command for stopping to save your messages
    
    /exclude - use this command to exclude chat to saving. 
    Example: /exclude massage-saver-bot
    `;

    await ctx.reply(message);
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
