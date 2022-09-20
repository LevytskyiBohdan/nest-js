import {
  Update,
  Command
} from "nestjs-telegraf";
import { Context } from "telegraf";
import { Api, TelegramClient } from "telegram";
import { StringSession } from 'telegram/sessions';
import { Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserModel } from "../models/user.model";
import { ConfigEnum } from "../enums/config.enum";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { User } from "../schemas/user.schema";
import { ISaveMessageDto } from "../interfaces/message.interface";
import PeerUser = Api.PeerUser;
import { MessageModel } from "../models/message.model";

@Update()
export class TelegramSaveMessagesService implements OnApplicationBootstrap {
  constructor(
    private usersModel: UserModel,
    private configService: ConfigService,
    private messageModel: MessageModel
  ) {}

  private readonly mapper = new Map<number, string>();
  private readonly logger = new Logger(TelegramSaveMessagesService.name);

  // private readonly getListener = async (number: number) => {
  //   return new Promise<string>((resolve, reject) => {
  //     const index = setInterval(() => {
  //       if (this.mapper.has(number)) {
  //         clearInterval(index);
  //         return resolve(this.mapper.get(number) as string);
  //       }
  //     }, 1000);
  //   });
  // };

  async onApplicationBootstrap() {
    for (let user of await this.usersModel.findAll()) {
      this.logger.log(await this.onStartListener(user.telegramUserID));
    }
  }

  @Command('/start_save')
  async number(ctx: Context) {
    const telegramUserID: number = Number((ctx.update as any)?.message?.from?.id);

  }

  async onStartListener(telegramUserID: number): Promise<string> {
    const user: User | null = await this.usersModel.findByTelegramUserID(telegramUserID);

    if(!user) {
      const message = 'User not found';
      this.logger.error(message, telegramUserID );
      return message;
    }

    const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
    const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

    const client = new TelegramClient(new StringSession(user.telegramSession), TELEGRAM_API_ID, TELEGRAM_API_HASH, {});
    await client.connect();

    const handler = async (event: NewMessageEvent) => {

      const body: ISaveMessageDto = {
        out: event.message.out || false,
        fromUserId: (event.message.fromId as PeerUser).userId.valueOf(),
        peerUserId: (event.message.peerId  as PeerUser).userId.valueOf(),
        message: event.message.message,
        telegramUserID,
        date: new Date()
      };

      await this.messageModel.saveMessage(body);
    }

    client.addEventHandler(handler, new NewMessage({}));

    return `Listener was started for - ${user.number}`;
  }

}


