// src/webhooks/webhooks.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('maya')
  @HttpCode(HttpStatus.OK) // Respond with 200 OK to acknowledge receipt
  async handleMaya(@Body() body: any) {
    // Note: For production, you should verify that the request comes from
    // Maya's known IP addresses as a security measure.
    await this.webhooksService.handleMayaWebhook(body);
    return { message: 'Webhook received' };
  }
}