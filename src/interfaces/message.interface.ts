export interface ISaveMessageDto {
  out: boolean;
  fromUserId: number | null;
  peerUserId: number;
  message: string;
  telegramUserID: number;
  date: Date;
}

export interface IExcludeMessageDto {
  telegramUserID: number;
  telegramExcludeUserID: number;
}
