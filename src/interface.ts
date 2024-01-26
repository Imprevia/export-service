/**
 * @description User-Service parameters
 */
export interface IUserOptions {
  uid: number;
}

export interface IImageOptions {
  url: string;
  cookies?: {
    name: string;
    value: string;
    path?: string;
    domain?: string;
  }[];
}
