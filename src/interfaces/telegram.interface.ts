
export interface ISetPhoneDto {
  phone: string;
}

export interface ISetCode extends ISetPhoneDto{
  code: string;
}

export interface ISendMessageDto {
  userName: string;
  message: string;
}