/**
 * Integrations routes (ADR-022 M2) — Settings > Integrations backing API.
 *
 *   GET    /api/v1/integrations            list (public shape, no credential material)
 *   GET    /api/v1/integrations/:id        one row
 *   POST   /api/v1/integrations            register MT5 cloud/statement connector
 *   PATCH  /api/v1/integrations/:id        rotate credential / toggle / edit label-server
 *   DELETE /api/v1/integrations/:id        disconnect (credential shredded)
 *   POST   /api/v1/integrations/:id/test   read-only connectivity probe
 *
 * There is intentionally NO route that returns a decrypted credential.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CreateIntegrationBody, IntegrationsService } from './integrations.service';
import { OwnerScoped, RequestWithOwner } from '../auth/owner.guard';

/**
 * ADR-023: `ownerId` selalu hasil resolusi OwnerGuard (sesi → owner; tanpa sesi →
 * 'user-local'). `?ownerId=` dan `body.ownerId` dari klien DIABAIKAN (deprecated).
 */
@OwnerScoped()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list(@Req() req: RequestWithOwner, @Query('ownerId') _queryOwnerId?: string) {
    return this.integrations.list(req.ownerId);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.integrations.get(id);
  }

  @Post()
  create(@Req() req: RequestWithOwner, @Body() body: CreateIntegrationBody) {
    return this.integrations.create(body, req.ownerId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CreateIntegrationBody) {
    return this.integrations.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.integrations.remove(id);
  }

  @Post(':id/test')
  test(@Param('id') id: string) {
    return this.integrations.testConnection(id);
  }
}
