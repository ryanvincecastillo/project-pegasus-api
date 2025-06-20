// src/users/users.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common'; // Remove Req
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client'; // Import the User type from Prisma
import { GetUser } from 'src/auth/decorator/get-user.decorator'; // Import our new decorator

@Controller('users')
export class UsersController {
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@GetUser() user: User) {
    // Use the decorator here
    return user;
  }
}
