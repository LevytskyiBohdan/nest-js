import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { User } from '../schemas/user.schema';
import { ISaveMessageDto } from '../interfaces/message.interface';
import { MessageModel } from '../models/message.model';
import { ExcludeMessageModel } from '../models/exclude-message.model';
import PeerUser = Api.PeerUser;
import { ExcludeMessage } from '../schemas/exclude-message.schema';

@Injectable()
export class TelegramSaveMessagesService implements OnApplicationShutdown {
  private readonly clients = new Map<number, { client: TelegramClient; event: NewMessage }>();
  private readonly logger = new Logger(TelegramSaveMessagesService.name);

  constructor(
    private usersModel: UserModel,
    private configService: ConfigService,
    private messageModel: MessageModel,
    private excludeMessageModel: ExcludeMessageModel,
  ) {}

  async onApplicationShutdown(signal: string) {
    console.log('ready to exit', signal);
    return await new Promise<void>(async (resolve, reject) => {
      for await (const client of this.clients[Symbol.iterator]()) {
        await client[1].client.session.close();
        await client[1].client.disconnect();
        this.logger.warn('Session is disconnected');
      }
      this.logger.warn('All sessions ware disconnected.');
      await setTimeout(() => {
        console.log('will exit now');
        resolve();
      }, 10000);
    });
  }

  async onStopListener(telegramUserID: number): Promise<string> {
    if (this.clients.has(telegramUserID)) {
      const client = this.clients.get(telegramUserID);

      client
        ? client.client.removeEventHandler((data: any) => {
            console.log(data, 'data>>>>');
          }, client.event)
        : null;

      return 'Saving was stopped. Thanks for using our bot.';
    }

    return "You still haven't saved your messages";
  }

  async onStartListener(telegramUserID: number): Promise<string> {
    if (this.clients.has(telegramUserID)) {
      return 'Your saving has been already started.';
    }

    const user: User | null = await this.usersModel.findByTelegramUserID(telegramUserID);

    if (!user) {
      const message = 'User not found';
      this.logger.error(message, telegramUserID);
      return message;
    }

    const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
    const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

    const client = new TelegramClient(new StringSession(user.telegramSession), TELEGRAM_API_ID, TELEGRAM_API_HASH, {
      appVersion: '2.12.8',
      deviceModel: 'PC',
      systemVersion: 'Windows_NT',
    });
    await client.connect();
    await client.getMe();

    const handler = async (event: NewMessageEvent) => {
      const body: ISaveMessageDto = {
        out: event.message.out || false,
        fromUserId: event.message.fromId ? (event.message.fromId as PeerUser).userId.valueOf() : null,
        peerUserId: (event.message.peerId as PeerUser).userId.valueOf(),
        message: event.message.message,
        telegramUserID,
        date: new Date(),
      };

      if (!(await this.isExclude(telegramUserID, body.peerUserId))) {
        await this.messageModel.saveMessage(body);
      }
    };

    const event = new NewMessage({});

    this.clients.set(telegramUserID, { client, event });

    client.addEventHandler(handler, event);

    return `Listener was started for - ${user.number}`;
  }

  async isExclude(telegramUserID: number, telegramExcludeUserID: number): Promise<null | ExcludeMessage> {
    return await this.excludeMessageModel.findToExcludeUser(telegramUserID, telegramExcludeUserID);
  }
}
