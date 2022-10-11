import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { IExcludeMessageDto } from '../interfaces/message.interface';
import {
  ExcludeMessage,
  ExcludeMessageDocument,
} from '../schemas/exclude-message.schema';

@Injectable()
export class ExcludeMessageModel {
  constructor(
    @InjectModel(ExcludeMessage.name)
    private excludeMessageModel: Model<ExcludeMessageDocument>,
  ) {}

  async saveExcludeUserID(
    excludeMessageDto: IExcludeMessageDto,
  ): Promise<ExcludeMessage> {
    const model = new this.excludeMessageModel(excludeMessageDto);
    return model.save();
  }

  async findToExcludeUser(
    telegramUserID: number,
    telegramExcludeUserID: number,
  ): Promise<ExcludeMessage | null> {
    return this.excludeMessageModel
      .findOne({ telegramUserID, telegramExcludeUserID })
      .exec();
  }
}
