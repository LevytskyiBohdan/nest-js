import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema()
export class Message {
  @Prop()
  out: boolean;

  @Prop()
  fromUserId: string;

  @Prop()
  peerUserId: string;

  @Prop()
  message: string;

  @Prop()
  telegramUserID: string;

  @Prop()
  date: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);