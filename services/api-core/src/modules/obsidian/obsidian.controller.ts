import { Controller, Post, Body } from '@nestjs/common';
import { ObsidianService } from './obsidian.service';

@Controller('obsidian')
export class ObsidianController {
  constructor(private readonly obsidianService: ObsidianService) {}

  @Post('export-note')
  exportNote(@Body() body: { title: string; tags: string[]; body: string }) {
    return this.obsidianService.generateObsidianMarkdownNote(
      body.title || 'Catatan Keuangan SAKU',
      body.tags || ['financial', 'saku'],
      body.body || 'Catatan transaksi harian.'
    );
  }
}
