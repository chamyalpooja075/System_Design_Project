import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'engineer@company.com', description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 6, description: 'User password' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Alice Engineer', required: false, description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;
}
