// src/customers/customers.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@UseGuards(AuthGuard('jwt')) // Protect all routes in this controller
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@GetUser() user: User, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(user.organizationId, createCustomerDto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.customersService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.customersService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      id,
      user.organizationId,
      updateCustomerDto,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on successful deletion
  @Delete(':id')
  remove(@GetUser() user: User, @Param('id') id: string) {
    return this.customersService.remove(id, user.organizationId);
  }
}
