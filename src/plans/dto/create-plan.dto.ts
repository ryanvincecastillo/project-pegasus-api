// src/plans/dto/create-plan.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsIn } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  price: number;

  @IsIn(['monthly', 'quarterly', 'annually'])
  billingCycle: string;
}
