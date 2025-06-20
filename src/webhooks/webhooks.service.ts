import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async handleMayaWebhook(payload: any) {
    if (payload.paymentStatus !== 'PAYMENT_SUCCESS') {
      this.logger.log(
        `Ignoring Maya event with status: ${payload.paymentStatus}`,
      );
      return;
    }

    const invoiceId = payload.requestReferenceNumber;
    if (!invoiceId) {
      this.logger.error('Webhook received without a requestReferenceNumber.');
      return;
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId },
    });

    if (!invoice) {
      this.logger.error(`Invoice not found for reference ID: ${invoiceId}`);
      return;
    }

    if (invoice.status === 'paid') {
      this.logger.warn(`Invoice ${invoice.id} is already marked as paid.`);
      return;
    }

    try {
        // Step 1: Update the invoice to 'paid'
        await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'paid', paidDate: new Date(payload.updatedAt) },
        });
        this.logger.log(`Updated Invoice #${invoice.id} to paid.`);

        // Step 2: Create the payment record
        await this.prisma.payment.create({
            data: {
                invoiceId: invoice.id,
                amount: payload.amount,
                method: payload.paymentScheme?.toLowerCase() || 'maya',
                status: 'succeeded',
                gatewayRefId: payload.id,
            },
        });
        this.logger.log(`Created Payment record for Invoice #${invoice.id}.`);

        this.logger.log(`Successfully processed payment for Invoice ${invoice.id}`);
    } catch (error) {
        this.logger.error(`Error processing payment for Invoice ${invoice.id}: ${error.message}`);
    }
  }
}
