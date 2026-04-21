import { initializePaddle } from '@paddle/paddle-js';

let paddle: any = null;

export async function initPaddle() {
  if (paddle) return paddle;

  const environment = (process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox').trim() as 'sandbox' | 'production';
  const token = (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'test_3251d959f441592a6abb85e50b6').trim();

  paddle = await initializePaddle({
    environment,
    token,
    debug: false,
    eventCallback: function(data: any) {
      if (data.name === 'checkout.completed') {
        const priceId = data.data?.items?.[0]?.price_id || '';
        const businessIds = [
          process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID,
          process.env.NEXT_PUBLIC_PADDLE_BUSINESS_YEARLY_PRICE_ID,
          process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PACK_PRICE_ID,
        ];
        const proIds = [
          process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID,
          process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID,
          process.env.NEXT_PUBLIC_PADDLE_PRO_PACK_PRICE_ID,
        ];
        const plan = businessIds.includes(priceId) ? 'business' : proIds.includes(priceId) ? 'pro' : 'credits';
        // Delay redirect to give the Paddle webhook time to update the DB
        // before the page reloads and refetches subscription data
        setTimeout(() => {
          window.location.href = `${window.location.origin}/?welcome=true&plan=${plan}`;
        }, 2500);
      }
    }
  });

  return paddle;
}

export async function openCheckout(priceId: string, userEmail: string, userId: string, discountCode?: string) {
  const paddleInstance = await initPaddle();
  const options: any = {
    items: [{ priceId, quantity: 1 }],
    customer: { email: userEmail },
    customData: { userId },
  };
  if (discountCode) {
    options.discountCode = discountCode;
  }
  await paddleInstance.Checkout.open(options);
}

export async function closeCheckout() {
  const paddleInstance = await initPaddle();
  paddleInstance.Checkout.close();
}
