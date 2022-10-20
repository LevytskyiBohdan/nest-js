import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModel } from '../models/user.model';
import { ConfigEnum } from '../enums/config.enum';
import { User } from '../schemas/user.schema';
import { ISaveUserSessionDto } from '../interfaces/user.interface';
import PhoneNumber from 'awesome-phonenumber';
import { Api } from 'telegram/tl';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import input from 'input';

@Injectable()
export class MainService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MainService.name);
  private readonly clients: TelegramClient[] = [];

  constructor(private usersModel: UserModel, private configService: ConfigService) {}

  async onApplicationShutdown(signal?: string): Promise<any> {
    console.log('ready to exit', signal);
    for (const client of this.clients) {
      await client.session.close();
      await client.disconnect();
      this.logger.warn('Session is disconnected');
    }

    return await new Promise<void>(async (resolve, reject) => {
      await setTimeout(() => {
        console.log('will exit now');
        resolve();
      }, 10000);
    });
  }

  async onApplicationBootstrap() {
    // for (const user of await this.usersModel.findAll()) {
    //   if (user.isUse) {
    //     this.logger.log(await this.onConnect(user.telegramUserID));
    //   } else {
    //     this.logger.log(`Listener wasn't started for ${user.number}`);
    //   }
    // }
    // await this.onSaveSessionByPrompt();
  }

  async onConnect(telegramUserID: number): Promise<string> {
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

    const telegramUser = await client.getMe();

    this.clients.push(client);

    await client.session.close();

    await client.disconnect();

    console.log(telegramUser, '>>>>>>>>>');

    return `Listener was started for - ${user.number}`;
  }

  async onSaveSessionByPrompt(): Promise<void> {
    try {
      this.logger.warn('Start to save session');

      const body: ISaveUserSessionDto = {
        number: '',
        telegramSession: '',
        telegramUserID: 0,
        isUse: true,
      };
      const stringSession = new StringSession('');

      const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
      const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));
      const client = new TelegramClient(stringSession, TELEGRAM_API_ID, TELEGRAM_API_HASH, {
        appVersion: '2.12.8',
        deviceModel: 'PC',
        systemVersion: 'Windows_NT',
        connectionRetries: 5,
      });

      const onNumberHandler = async (number: string) => {
        const phoneNumber = new PhoneNumber(number);

        if (phoneNumber.isValid()) {
          body.number = phoneNumber.getNumber();
          return phoneNumber.getNumber();
        } else {
          this.logger.error('Phone number is invalid.');
          return 'null';
        }
      };

      await client.start({
        phoneNumber: async () => await onNumberHandler(await input.text('Please enter your number: ')),
        password: async () => await input.text('Please enter your password: '),
        phoneCode: async () => await input.text('Please enter the code you received: '),
        forceSMS: true,
        onError: (err) => this.logger.error(err),
      });
      const telegramSession = client.session.save() as unknown as string;

      if (telegramSession) {
        body.telegramSession = telegramSession;
      }

      await new Promise<void>(async (resolve) => {
        await setTimeout(() => resolve(), 2000);
      });

      const telegramUser = await client.getMe();

      if (telegramUser && telegramUser instanceof Api.User && telegramUser.id) {
        body.telegramUserID = telegramUser.id.valueOf();
      }

      if (telegramUser && telegramUser instanceof Api.InputPeerUser && telegramUser.userId) {
        body.telegramUserID = telegramUser.userId.valueOf();
      }

      console.log(stringSession, 'stringSession');

      await new Promise<void>(async (resolve) => {
        await setTimeout(() => resolve(), 2000);
      });

      await this.usersModel.saveUserSession(body);

      await client.session.close();

      await client.disconnect();

      this.logger.log('Session is closed');
    } catch (error) {
      this.logger.log(error);
    }
  }
}
