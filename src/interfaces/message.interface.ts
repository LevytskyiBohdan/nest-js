export interface ISaveMessageDto {
  out: boolean;
  fromUserId: number | null;
  peerUserId: number | null;
  message: string;
  telegramUserID: number;
  date: Date;
}
