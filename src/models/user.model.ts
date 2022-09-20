import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { ISaveUserSessionDto } from "../interfaces/user.interface";

@Injectable()
export class UserModel {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async saveUserSession(createUserDto: ISaveUserSessionDto): Promise<User> {
    const model = new this.userModel(createUserDto);
    return model.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findByNumber(number: string): Promise<User | null> {
    return this.userModel.findOne({ number }).exec();
  }

  async findByTelegramUserID(telegramUserID: number): Promise<User | null> {
    return this.userModel.findOne({ telegramUserID }).exec();
  }

}
