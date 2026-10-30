import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'engineer@company.com', description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
