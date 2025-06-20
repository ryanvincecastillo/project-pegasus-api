import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { User } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  create(@GetUser() user: User, @Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(user.organizationId, createPlanDto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.plansService.findAll(user.organizationId);
  }
}
