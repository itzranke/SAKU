import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LedgerService, RawJournalBody } from './ledger.service';
import { AccountDef, SimpleTransactionInput } from '@saku/ledger-core';

/**
 * Routes (append-only ledger — deliberately no PUT/PATCH/DELETE):
 *   GET  /api/v1/ledger/snapshot        accounts + derived totals + recent journals
 *   GET  /api/v1/ledger/accounts        chart of accounts
 *   POST /api/v1/ledger/accounts        register account (+ optional opening journal)
 *   GET  /api/v1/ledger/journals?limit= raw immutable journals
 *   POST /api/v1/ledger/journal         raw double-entry legs (validated)
 *   POST /api/v1/ledger/transaction     simple UX transaction (mapped to legs)
 */
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('snapshot')
  snapshot(@Query('recentLimit') recentLimit?: string) {
    return this.ledger.getSnapshot(Number(recentLimit) || 25);
  }

  @Get('accounts')
  accounts() {
    return this.ledger.listAccounts();
  }

  @Post('accounts')
  createAccount(@Body() body: { name: string; type: string; currency?: string; code?: string; initialBalance?: number }) {
    const allowed = ['BANK', 'EWALLET', 'CASH', 'CREDIT_CARD', 'INVESTMENT', 'TRADING', 'OWNERS_EQUITY', 'INCOME', 'EXPENSE'];
    if (!body?.name || !allowed.includes(body?.type)) {
      throw new BadRequestException(`name is required and type must be one of: ${allowed.join(', ')}`);
    }
    return this.ledger.createAccount({
      name: body.name,
      type: body.type as AccountDef['type'],
      currency: body.currency ?? 'IDR',
      code: body.code,
      initialBalance: body.initialBalance,
    });
  }

  @Get('journals')
  journals(@Query('limit') limit?: string) {
    return this.ledger.getJournals(limit ? Number(limit) : undefined);
  }

  @Post('journal')
  postJournal(@Body() body: RawJournalBody) {
    return this.ledger.postRawJournal(body);
  }

  @Post('transaction')
  postTransaction(
    @Body() body: SimpleTransactionInput & { source?: 'MANUAL' | 'STATEMENT_IMPORT' | 'BOT_CAPTURE' }
  ) {
    const { source, ...tx } = body;
    return this.ledger.postSimpleTransaction(tx, source ?? 'MANUAL');
  }
}
