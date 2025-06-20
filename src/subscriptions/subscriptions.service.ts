// src/subscriptions/subscriptions.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { addMonths, addQuarters, addYears } from 'date-fns';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateSubscriptionDto) {
    // Verify that the customer and plan belong to the user's organization
    const [customer, plan] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: dto.customerId } }),
      this.prisma.plan.findUnique({ where: { id: dto.planId } }),
    ]);

    if (
      !customer ||
      !plan ||
      customer.organizationId !== organizationId ||
      plan.organizationId !== organizationId
    ) {
      throw new ForbiddenException('Access to resource denied');
    }

    // Calculate the next billing date based on the plan
    const now = new Date();
    let nextBillDate: Date;

    switch (plan.billingCycle) {
      case 'monthly':
        nextBillDate = addMonths(now, 1);
        break;
      case 'quarterly':
        nextBillDate = addQuarters(now, 1);
        break;
      case 'annually':
        nextBillDate = addYears(now, 1);
        break;
      default:
        // Default to one month if cycle is unknown
        nextBillDate = addMonths(now, 1);
        break;
    }

    return this.prisma.subscription.create({
      data: {
        customerId: dto.customerId,
        planId: dto.planId,
        status: 'active',
        nextBillDate,
      },
    });
  }

  findAll(organizationId: string) {
    // Find all subscriptions for all customers in an organization
    return this.prisma.subscription.findMany({
      where: {
        customer: {
          organizationId: organizationId,
        },
      },
      include: {
        customer: { select: { name: true } },
        plan: { select: { name: true, price: true } },
      },
    });
  }
}