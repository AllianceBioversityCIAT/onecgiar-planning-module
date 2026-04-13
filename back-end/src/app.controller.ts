import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller()
export class AppController {
  @Get('version')
  getVersion() {
    let version = 'dev';
    try {
      const file = readFileSync(join(__dirname, '..', 'version.json'), 'utf8');
      version = JSON.parse(file).version || 'dev';
    } catch {}
    return { version };
  }
}
