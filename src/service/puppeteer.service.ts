import { Provide } from '@midwayjs/core';
import { IImageOptions } from '../interface';
import { PuppeteerPool } from '../util/puppeteer-pool';

@Provide()
export class PuppeteerService {
  async getImage(data: IImageOptions) {
    const pool = await PuppeteerPool.getInstance();
    return pool.use(async instance => {
      const page = await instance.newPage();
      if (data.cookies) {
        await page.setCookie(...data.cookies);
      }
      await page.goto(data.url);
      const buffer = await page.screenshot({ fullPage: true, type: 'jpeg' });
      await page.close();
      return buffer;
    });
  }

  async getPdf(data: IImageOptions) {
    const pool = await PuppeteerPool.getInstance();
    return pool.use(async instance => {
      const page = await instance.newPage();
      if (data.cookies) {
        await page.setCookie(...data.cookies);
      }
      await page.goto(data.url);
      const buffer = await page.pdf({
        printBackground: true,
        margin: {
          top: 20,
          bottom: 20,
        },
      });
      await page.close();
      return buffer;
    });
  }
}
