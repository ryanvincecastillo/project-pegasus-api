import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  create(organizationId: string, dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        organizationId,
        ...dto,
      },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.plan.findMany({ where: { organizationId } });
  }
}
