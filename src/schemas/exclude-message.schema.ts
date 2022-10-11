import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExcludeMessageDocument = ExcludeMessage & Document;

@Schema()
export class ExcludeMessage {
  @Prop()
  telegramUserID: number;

  @Prop()
  telegramExcludeUserID: number;
}

export const ExcludeMessageSchema =
  SchemaFactory.createForClass(ExcludeMessage);
