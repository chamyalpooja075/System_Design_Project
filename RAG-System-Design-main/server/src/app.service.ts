import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'system-design-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
