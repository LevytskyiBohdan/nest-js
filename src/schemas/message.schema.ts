import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema()
export class Message {
  @Prop()
  out: boolean;

  @Prop({ default: '' })
  fromUserId: string;

  @Prop({ default: '' })
  peerUserId: string;

  @Prop()
  message: string;

  @Prop()
  telegramUserID: string;

  @Prop()
  date: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ lastModifiedDate: 1 }, { expireAfterSeconds: 604_800 });
