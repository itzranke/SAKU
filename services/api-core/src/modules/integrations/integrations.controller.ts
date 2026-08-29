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
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateIntegrationBody, IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list(@Query('ownerId') ownerId?: string) {
    return this.integrations.list(ownerId);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.integrations.get(id);
  }

  @Post()
  create(@Body() body: CreateIntegrationBody) {
    return this.integrations.create(body);
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
