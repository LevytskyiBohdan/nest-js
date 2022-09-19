import { Body, Controller, Param, Post, Query } from "@nestjs/common";
import { UserService } from "../services/user.service";
// @ts-ignore
import { Express } from 'express';
import { ISendMessageDto, ISetCode, ISetPhoneDto } from "../interfaces/telegram.interface";

@Controller()
export class TelegramController {
  constructor(private userService: UserService) {}

  @Post('phone')
  async setPhone(@Param() param: any, @Body() boby: ISetPhoneDto, @Query() query: any) {
    return await this.userService.saveSession(boby.phone);
  }

  @Post('code')
  async setCode(@Param() param: any, @Body() boby: ISetCode, @Query() query: any) {
    return await this.userService.setCode(boby.code, boby.phone);
  }

  @Post('message')
  async sendMessage(@Param() param: any, @Body() boby: ISendMessageDto, @Query() query: any) {
    return await this.userService.sendMessage(boby.userName, boby.message);
  }

  @Post('dialog-list')
  async dialogList(@Param() param: any, @Body() boby: ISetPhoneDto, @Query() query: any) {
    return await this.userService.getDialogList(boby.phone);
  }
}