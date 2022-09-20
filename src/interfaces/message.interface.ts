import { Prop } from "@nestjs/mongoose";

export interface ISaveMessageDto {
  out: boolean;
  fromUserId: number;
  peerUserId: number;
  message: string;
  telegramUserID: number;
  date: Date;
}