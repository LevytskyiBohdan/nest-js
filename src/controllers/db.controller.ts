import { Body, Controller, Get, Param, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { User } from "../schemas/user.schema";
import { UserService } from "../services/user.service";
import { FileInterceptor } from '@nestjs/platform-express';
// @ts-ignore
import { Express } from 'express';

@Controller()
export class DBController {
  constructor(private userService: UserService) {}

  @Get('all-users')
  async getAllUsers(): Promise<User[]> {
    const users: User[] = await this.userService.getAllUsers();

    return users;
  }

  @Put('update-user')
  update(@Param() param: any, @Body() boby: any, @Query() query: any) {
    console.log(param, '>>>>>param');
    console.log(boby, '>>>>>boby');
    console.log(query, '>>>>>query');
    return null;
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
  }
}