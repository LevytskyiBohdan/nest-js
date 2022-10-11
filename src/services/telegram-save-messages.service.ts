import { Update, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { User } from '../schemas/user.schema';
import { ISaveMessageDto } from '../interfaces/message.interface';
import PeerUser = Api.PeerUser;
import { MessageModel } from '../models/message.model';
import { ExcludeMessageModel } from '../models/exclude-message.model';

@Update()
export class TelegramSaveMessagesService implements OnApplicationBootstrap {
  constructor(
    private usersModel: UserModel,
    private configService: ConfigService,
    private messageModel: MessageModel,
    private excludeMessageModel: ExcludeMessageModel,
  ) {}

  private readonly mapper = new Map<
    number,
    { client: TelegramClient; event: NewMessage }
  >();
  private readonly logger = new Logger(TelegramSaveMessagesService.name);

  async onApplicationBootstrap() {
    for (const user of await this.usersModel.findAll()) {
      this.logger.log(await this.onStartListener(user.telegramUserID));
    }
  }

  @Command('/start_save')
  async startSave(ctx: Context) {
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);

    const message = await this.onStartListener(telegramUserID);

    await ctx.reply(message);
  }

  @Command('/stop_save')
  async stopSave(ctx: Context) {
    const telegramUserID = Number((ctx.update as any)?.message?.from?.id);

    const messsage = await this.onStopListener(telegramUserID);

    await ctx.reply(messsage);
  }

  async onStopListener(telegramUserID: number): Promise<string> {
    if (this.mapper.has(telegramUserID)) {
      const client = this.mapper.get(telegramUserID);

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
    if (this.mapper.has(telegramUserID)) {
      return 'Your saving has been already started.';
    }

    const user: User | null = await this.usersModel.findByTelegramUserID(
      telegramUserID,
    );

    if (!user) {
      const message = 'User not found';
      this.logger.error(message, telegramUserID);
      return message;
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

    const handler = async (event: NewMessageEvent) => {
      const body: ISaveMessageDto = {
        out: event.message.out || false,
        fromUserId: event.message.fromId
          ? (event.message.fromId as PeerUser).userId.valueOf()
          : null,
        peerUserId: (event.message.peerId as PeerUser).userId.valueOf(),
        message: event.message.message,
        telegramUserID,
        date: new Date(),
      };

      if (await this.isSaveMessage(telegramUserID, body.peerUserId)) {
        await this.messageModel.saveMessage(body);
      }
    };

    const event = new NewMessage({});

    this.mapper.set(telegramUserID, { client, event });

    client.addEventHandler(handler, event);

    return `Listener was started for - ${user.number}`;
  }

  async isSaveMessage(
    telegramUserID: number,
    telegramExcludeUserID: number,
  ): Promise<boolean> {
    return await !this.excludeMessageModel.findToExcludeUser(
      telegramUserID,
      telegramExcludeUserID,
    );
  }
}
