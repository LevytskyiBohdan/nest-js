import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { Message, MessageDocument } from '../schemas/message.schema';
import { ISaveMessageDto } from '../interfaces/message.interface';

@Injectable()
export class MessageModel {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async saveMessage(saveMessageDto: ISaveMessageDto): Promise<Message> {
    const model = new this.messageModel(saveMessageDto);
    return model.save();
  }
}
