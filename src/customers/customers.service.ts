// src/customers/customers.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // GET ALL CUSTOMERS FOR THE ORGANIZATION
  findAll(organizationId: string) {
    return this.prisma.customer.findMany({
      where: { organizationId },
    });
  }

  // GET ONE CUSTOMER
  async findOne(customerId: string, organizationId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.organizationId !== organizationId) {
      throw new ForbiddenException('Access to resource denied');
    }
    return customer;
  }

  // CREATE A CUSTOMER
  create(organizationId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        organizationId,
        ...dto,
      },
    });
  }

  // UPDATE A CUSTOMER
  async update(
    customerId: string,
    organizationId: string,
    dto: UpdateCustomerDto,
  ) {
    // First, verify the user has access to this customer
    await this.findOne(customerId, organizationId);

    return this.prisma.customer.update({
      where: { id: customerId },
      data: { ...dto },
    });
  }

  // DELETE A CUSTOMER
  async remove(customerId: string, organizationId: string) {
    // First, verify the user has access to this customer
    await this.findOne(customerId, organizationId);

    return this.prisma.customer.delete({
      where: { id: customerId },
    });
  }
}
