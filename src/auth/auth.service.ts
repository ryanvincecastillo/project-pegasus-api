// src/auth/auth.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // --- SIGN UP ---
  async signup(dto: SignUpDto): Promise<{ accessToken: string }> {
    // Generate the hashed password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // Save the new user and their organization in the database
    // We use a transaction to ensure that if one operation fails, both are rolled back.
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName,
          },
        });

        const newUser = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            organizationId: organization.id,
          },
        });

        return newUser;
      });

      // Return a signed JWT for the new user
      return this.signToken(user.id, user.email, user.organizationId);
    } catch (error) {
      // Catch potential database errors, like a non-unique email
      if (error.code === 'P2002') {
        // Prisma unique constraint violation code
        throw new ForbiddenException('Credentials taken');
      }
      throw error;
    }
  }

  // --- SIGN IN ---
  async signin(dto: SignInDto): Promise<{ accessToken: string }> {
    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    // If user does not exist, throw an error
    if (!user) {
      throw new ForbiddenException('Credentials incorrect');
    }

    // Compare password with the one in the database
    const pwMatches = await bcrypt.compare(dto.password, user.password);
    // If password does not match, throw an error
    if (!pwMatches) {
      throw new ForbiddenException('Credentials incorrect');
    }

    // Return a signed JWT
    return this.signToken(user.id, user.email, user.organizationId);
  }

  // --- TOKEN SIGNING HELPER ---
  async signToken(
    userId: string,
    email: string,
    organizationId: string,
  ): Promise<{ accessToken: string }> {
    const payload = {
      sub: userId,
      email,
      orgId: organizationId,
    };

    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
      secret: secret,
    });

    return {
      accessToken: token,
    };
  }
}
