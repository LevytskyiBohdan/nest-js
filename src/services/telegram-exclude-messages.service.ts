import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';
import { User } from '../schemas/user.schema';
import { Dialog } from 'telegram/tl/custom/dialog';
import { ExcludeMessageModel } from '../models/exclude-message.model';
import PeerUser = Api.PeerUser;

@Injectable()
export class TelegramExcludeMessagesService {
  private readonly logger = new Logger(TelegramExcludeMessagesService.name);

  constructor(
    private usersModel: UserModel,
    private configService: ConfigService,
    private excludeMessageModel: ExcludeMessageModel,
  ) {}

  async onExcludeMessages(telegramUserID: number, telegramExcludeUserName: string): Promise<string> {
    const telegramExcludeUserID = await this.getTelegramExcludeUserID(telegramUserID, telegramExcludeUserName);

    if (telegramExcludeUserID) {
      await this.excludeMessageModel.saveExcludeUserID({
        telegramUserID,
        telegramExcludeUserID,
      });

      return `Messages from ${telegramExcludeUserName} will be excluded to save.`;
    } else {
      const message = 'Something went wrong... try again later...';
      this.logger.error(message);
      return message;
    }
  }

  async getTelegramExcludeUserID(telegramUserID: number, telegramExcludeUserName: string): Promise<number | null> {
    try {
      const user: User | null = await this.usersModel.findByTelegramUserID(telegramUserID);

      if (!user) {
        this.logger.error('User is not initiated yet.', telegramUserID);
        return null;
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

      const dialogs = await client.getDialogs({});
      const dialog = dialogs.find((d: Dialog) => d.title === telegramExcludeUserName);

      if (!dialog) {
        throw new Error('Dialog does not exist');
      }

      return (dialog?.message?.peerId as PeerUser).userId.valueOf();
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }
}
