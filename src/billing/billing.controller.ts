// src/billing/billing.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { User } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('billing/run-job') // Manual trigger endpoint
  runBillingJob() {
    this.billingService.handleDailyBilling();
    return { message: 'Billing job started. Check server logs for details.' };
  }

  @Get('invoices') // Endpoint to view generated invoices
  getInvoices(@GetUser() user: User) {
    return this.billingService.findAllInvoices(user.organizationId);
  }
}