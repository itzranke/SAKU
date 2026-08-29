import { Controller, GET, POST, Body } from '@nestjs/common';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @GET()
  getAccounts() {
    return this.accountsService.getAccounts();
  }

  @POST()
  createAccount(@Body() body: { name: string; type: string; currency: string; initialBalance: number }) {
    return this.accountsService.createAccount(body);
  }
}
