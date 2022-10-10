import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigEnum } from './enums/config.enum';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserModel } from './models/user.model';
import { TelegramUpdate } from './services/telegram.service';
import { TelegramSaveSessionService } from './services/telegram-save-session.service';
import { TelegramSaveMessagesService } from './services/telegram-save-messages.service';
import { MessageModel } from './models/message.model';
import { Message, MessageSchema } from './schemas/message.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>(ConfigEnum.TELEGRAM_TOKEN) as string,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRoot(process.env[ConfigEnum.DB] as string),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [],
  providers: [
    AppService,
    UserModel,
    TelegramUpdate,
    TelegramSaveSessionService,
    TelegramSaveMessagesService,
    MessageModel,
  ],
})
export class AppModule {}
