import { Controller, Get, Post, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('plans')
  getPlans() {
    return this.paymentService.getPlans();
  }

  @Post('checkout')
  createCheckout(@Body() body: { planId: string; email: string }) {
    return this.paymentService.createSubscriptionInvoice(body.planId, body.email);
  }

  @Post('webhook')
  handleWebhook(@Body() payload: any) {
    return this.paymentService.handlePaymentWebhook(payload);
  }
}
