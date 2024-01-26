import { Inject, Controller, Get } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { PuppeteerService } from '../service/puppeteer.service';

@Controller('/')
export class APIController {
  @Inject()
  ctx: Context;

  @Inject()
  puppeteerService: PuppeteerService;

  @Get('/img')
  async getImg() {
    const buffer = await this.puppeteerService.getImage({
      url: 'https://www.baidu.com',
    });
    this.ctx.type = 'image/jpeg';
    this.ctx.set('Accept', 'image/webp,image/apng,image/png,image/*,*/*;q=0.8');
    // 下载图片
    // this.ctx.set('content-disposition', 'attachment; filename="baidu.png"');
    this.ctx.body = buffer;
  }

  @Get('/pdf')
  async getPdf() {
    const buffer = await this.puppeteerService.getPdf({
      url: 'https://www.baidu.com',
    });
    this.ctx.type = '.pdf';
    // this.ctx.set('Content-Type', 'application/octet-stream');
    this.ctx.set('Accept', 'image/webp,image/apng,image/png,image/*,*/*;q=0.8');
    // 下载PDF
    // this.ctx.set('content-disposition', 'attachment; filename="baidu.png"');
    this.ctx.body = buffer;
  }
}
