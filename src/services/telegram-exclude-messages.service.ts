import { Update, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';
import { User } from '../schemas/user.schema';
import PeerUser = Api.PeerUser;
import { Dialog } from 'telegram/tl/custom/dialog';
import { ExcludeMessageModel } from '../models/exclude-message.model';

@Update()
export class TelegramExcludeMessagesService {
  constructor(
    private usersModel: UserModel,
    private configService: ConfigService,
    private excludeMessageModel: ExcludeMessageModel,
  ) {}

  private readonly logger = new Logger(TelegramExcludeMessagesService.name);

  @Command('/exclude')
  async startSave(ctx: Context) {
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);
    const telegramExcludeUserName = String(
      (ctx.update as any)?.message?.text?.replace(/\/exclude /, ''),
    );

    const telegramExcludeUserID = await this.getTelegramExcludeUserID(
      telegramUserID,
      telegramExcludeUserName,
    );

    if (telegramExcludeUserID) {
      await this.excludeMessageModel.saveExcludeUserID({
        telegramUserID,
        telegramExcludeUserID,
      });
      await ctx.reply(
        `Messages from ${telegramExcludeUserName} will be excluded to save.`,
      );
    } else {
      await ctx.reply('Something went wrong... try again later...');
    }
  }

  async getTelegramExcludeUserID(
    telegramUserID: number,
    telegramExcludeUserName: string,
  ): Promise<number | null> {
    try {
      const user: User | null = await this.usersModel.findByTelegramUserID(
        telegramUserID,
      );

      if (!user) {
        this.logger.error('User is not initiated yet.', telegramUserID);
        return null;
      }

      const TELEGRAM_API_ID = Number(
        this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID),
      );
      const TELEGRAM_API_HASH = String(
        this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH),
      );

      const client = new TelegramClient(
        new StringSession(user.telegramSession),
        TELEGRAM_API_ID,
        TELEGRAM_API_HASH,
        {},
      );
      await client.connect();

      const dialogs = await client.getDialogs({});
      const dialog = dialogs.find(
        (d: Dialog) => d.title === telegramExcludeUserName,
      );

      return (dialog?.message?.peerId as PeerUser).userId.valueOf();
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }
}
