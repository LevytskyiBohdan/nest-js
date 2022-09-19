import { Injectable, Logger } from "@nestjs/common";
import { UsersModel } from "../models/user.model";
import { User } from "../schemas/user.schema";
import PhoneNumber from "awesome-phonenumber";
import { ConfigEnum } from "../enums/config.enum";
import { TelegramClient, Api } from "telegram";
import { ConfigService } from "@nestjs/config";
import { StringSession } from "telegram/sessions";
import { TotalList } from "telegram/Helpers";

const stringSession = new StringSession('');

@Injectable()
export class UserService {
  constructor(
    private readonly userModel: UsersModel,
    private readonly configService: ConfigService,
    private readonly usersModel: UsersModel
  ) {
  }

  private readonly mapper = new Map<string, string>();
  private readonly logger = new Logger(UserService.name);

  private readonly getCode = async (number: string) => {
    return new Promise<string>((resolve, reject) => {
      const index = setInterval(() => {
        if (this.mapper.has(number)) {
          clearInterval(index);
          return resolve(this.mapper.get(number) as string);
        }
      }, 1000);
    });
  };

  async saveSession(phone: string): Promise<string> {
    try {
      const phoneNumber = new PhoneNumber(phone);

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
          phoneNumber: async () => phone,
          phoneCode: async () => await this.getCode(phone),
          onError: (err: Error) => this.logger.error(err)
        })
          .then(async res => {
            this.logger.warn(`Responce - ${res}`);
            const telegramSession = client.session.save() as unknown;
            this.logger.log(`Adding number ${phoneNumber.getNumber()} to our db with session: ${telegramSession}`);
            await this.usersModel.saveUserSession({
              name: 'Bohdan',
              number: phoneNumber.getNumber(),
              telegramSession: telegramSession as string,
              telegramUserID: phone
            });
            // await this.userModel.create({ phoneNumber: phoneNumber.getNumber(), telegramSession });
          });
          return 'You will receive code soon';
      }
      return 'Phone number is invalid';
    } catch (e) {
      this.logger.error(e);
      return e;
    }
  }

  setCode(code: string, phone: string): string {
    try {
      if (!phone) {
        this.logger.error('Wrong phone number');
        return 'Wrong phone number';
      }
      if (!code) {
        this.logger.error('Wrong code');
        return 'Wrong code';
      }
      this.mapper.set(phone, code);
      this.logger.error('Wrong code');
      return 'Done. Waiting for login...'
    } catch (e) {
      this.logger.error(e);
      return e;
    }
  }

  async sendMessage(userNane: string, message: string): Promise<string> {
    const user: User | null = await this.userModel.findByNumber('+380985297221');

    if(!user) {
      this.logger.error('User not found');
      return 'User not found';
    }

    try {
      const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
      const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

      const client = new TelegramClient(new StringSession(user.telegramSession),TELEGRAM_API_ID,TELEGRAM_API_HASH,{});
      await client.connect();
      await client.sendMessage(userNane, { message });

    } catch (e) {
      this.logger.error(e);
      return e;
    }

    return 'Done'

  }

  async getDialogList(phone: string): Promise<string | TotalList<unknown>> {
    try {

      const user: User | null = await this.usersModel.findByNumber(phone);

      if(!user) {
        const message = 'User not found';
        this.logger.error(message);
        return message;
      }

      const TELEGRAM_API_ID = Number(this.configService.get<number>(ConfigEnum.TELEGRAM_API_ID));
      const TELEGRAM_API_HASH = String(this.configService.get<string>(ConfigEnum.TELEGRAM_API_HASH));

      const client = new TelegramClient(new StringSession(user.telegramSession),TELEGRAM_API_ID,TELEGRAM_API_HASH,{});
      await client.connect();

      const dialogs: TotalList<unknown> = await client.getDialogs({});
      console.log(dialogs);
      return JSON.stringify(dialogs);

    } catch (e) {
      this.logger.error(e);
      return e;
    }

  }

  async getAllUsers(): Promise<User[]> {
    return await this.userModel.findAll();
  }
}