import { Module } from '@nestjs/common';
import { AppService } from "./app.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigEnum } from "./enums/config.enum";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./schemas/user.schema";
import { UsersModel } from "./models/user.model";
import { DBController } from "./controllers/db.controller";
import { UserService } from "./services/user.service";
import { TelegramUpdate } from "./services/telegram.service";
import { TelegramController } from "./controllers/telegram.controller";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>(ConfigEnum.TELEGRAM_TOKEN) as string
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRoot(process.env[ConfigEnum.DB] as string),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [DBController, TelegramController],
  providers: [AppService, UsersModel, UserService, TelegramUpdate],
})
export class AppModule {}
