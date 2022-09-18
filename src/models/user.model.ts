import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { ISaveUserSessionDto } from "../interfaces/user.interface";

@Injectable()
export class UsersModel {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: ISaveUserSessionDto): Promise<User> {
    const createdCat = new this.userModel(createUserDto);
    return createdCat.save();
  }

  async saveUserSession(createUserDto: ISaveUserSessionDto): Promise<User> {
    const createdCat = new this.userModel(createUserDto);
    return createdCat.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findByNumber(number: string): Promise<User | null> {
    return this.userModel.findOne({ number: number }).exec();
  }


}
