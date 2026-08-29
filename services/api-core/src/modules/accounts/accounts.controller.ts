import { Controller, Get, Post, Body } from '@nestjs/common';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  getAccounts() {
    return this.accountsService.getAccounts();
  }

  @Post()
  createAccount(@Body() body: { name: string; type: string; currency: string; initialBalance: number }) {
    return this.accountsService.createAccount(body);
  }
}
