import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigEnum } from './enums/config.enum';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserModel } from './models/user.model';
import { TelegramSaveSessionService } from './services/telegram-save-session.service';
import { TelegramSaveMessagesService } from './services/telegram-save-messages.service';
import { MessageModel } from './models/message.model';
import { Message, MessageSchema } from './schemas/message.schema';
import { TelegramExcludeMessagesService } from './services/telegram-exclude-messages.service';
import { ExcludeMessage, ExcludeMessageSchema } from './schemas/exclude-message.schema';
import { ExcludeMessageModel } from './models/exclude-message.model';
import { TelegramService } from './services/telegram.service';
import { MainService } from './services/main.service';

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
      { name: ExcludeMessage.name, schema: ExcludeMessageSchema },
    ]),
  ],
  controllers: [],
  providers: [
    AppService,
    UserModel,
    MainService,
    TelegramSaveSessionService,
    TelegramSaveMessagesService,
    TelegramExcludeMessagesService,
    MessageModel,
    ExcludeMessageModel,
    TelegramService,
  ],
})
export class AppModule {}
