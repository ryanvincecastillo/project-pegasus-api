// src/billing/billing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { addDays, addMonths, addQuarters, addYears } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private mayaSecretKey: string;
  private mayaApiUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.mayaApiUrl = this.config.get('MAYA_API_URL');
    this.mayaSecretKey = this.config.get('MAYA_SECRET_KEY');
  }

  // This cron job will run every day at 1 AM server time.
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyBilling() {
    this.logger.log('Running Daily Billing Job...');
    const now = new Date();

    // Find all active subscriptions that are due for billing.
    const subscriptionsToBill = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        nextBillDate: {
          lte: now, // lte = Less Than or Equal to
        },
      },
      include: {
        plan: true,
        customer: true,
      },
    });

    if (subscriptionsToBill.length === 0) {
      this.logger.log('No subscriptions to bill today.');
      return;
    }

    this.logger.log(
      `Found ${subscriptionsToBill.length} subscriptions to bill.`,
    );

    for (const sub of subscriptionsToBill) {
      let invoiceId: string;

      try {
        // --- Step 1: Create a DRAFT invoice to get a stable ID ---
        const draftInvoice = await this.prisma.invoice.create({
          data: {
            customerId: sub.customerId,
            organizationId: sub.customer.organizationId,
            status: 'draft', // Start as draft
            amount: sub.plan.price,
            dueDate: addDays(now, 15),
            items: {
              create: [
                {
                  description: `Subscription: ${sub.plan.name}`,
                  quantity: 1,
                  unitPrice: sub.plan.price,
                },
              ],
            },
          },
        });
        invoiceId = draftInvoice.id;
        this.logger.log(`Created Draft Invoice #${invoiceId}`);

        // --- Step 2: Create Maya Checkout Session ---
        const mayaPayload = {
          totalAmount: {
            value: sub.plan.price,
            currency: 'PHP',
          },
          items: [
            {
              name: `Subscription: ${sub.plan.name}`,
              quantity: 1,
              totalAmount: { value: sub.plan.price, currency: 'PHP' },
            },
          ],
          requestReferenceNumber: invoiceId, // Use our invoice ID as the reference!
          redirectUrl: {
            success: `https://your-frontend.com/payment/success?id=${invoiceId}`,
            failure: `https://your-frontend.com/payment/failure?id=${invoiceId}`,
            cancel: `https://your-frontend.com/payment/cancel?id=${invoiceId}`,
          },
        };

        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(this.mayaSecretKey + ':').toString('base64')}`,
        };

        const response = await axios.post(this.mayaApiUrl, mayaPayload, {
          headers,
        });
        const { checkoutId, redirectUrl } = response.data;

        // --- Step 3: Update our invoice with Maya details ---
        const invoiceUpdateData = {
            status: 'sent',
            gatewayCheckoutId: checkoutId,
            paymentUrl: redirectUrl,
        };

        await this.prisma.$transaction(async (tx) => {
          await tx.invoice.update({
              where: { id: invoiceId },
              data: invoiceUpdateData, // Use the explicit object here
          });

          // --- Step 4: Update the Subscription's nextBillDate ---
          let newNextBillDate: Date;
          const lastBillDate = sub.nextBillDate;
          switch (sub.plan.billingCycle) {
            case 'monthly':
              newNextBillDate = addMonths(lastBillDate, 1);
              break;
            // ... other cases
            default:
              newNextBillDate = addMonths(lastBillDate, 1);
          }
          await tx.subscription.update({
            where: { id: sub.id },
            data: { nextBillDate: newNextBillDate },
          });
        });

        this.logger.log(
          `Invoice #${invoiceId} updated with Maya payment link and subscription advanced.`,
        );
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        this.logger.error(
          `Failed to process billing for subscription #${sub.id} (Invoice: ${invoiceId}). Error: ${errorMessage}`,
        );
        // Optional: Clean up the draft invoice if it exists
        if (invoiceId) {
          await this.prisma.invoice
            .delete({ where: { id: invoiceId } })
            .catch((e) => {});
        }
      }
    }

    this.logger.log('Daily Billing Job Finished.');
  }

  findAllInvoices(organizationId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId },
      include: {
        customer: { select: { name: true } },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
