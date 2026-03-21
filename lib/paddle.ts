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
        window.location.href = window.location.origin + '/?welcome=true';
      }
    }
  });

  return paddle;
}

export async function openCheckout(priceId: string, userEmail: string, userId: string) {
  const paddleInstance = await initPaddle();
  await paddleInstance.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: userEmail },
    customData: { userId },
  });
}

export async function closeCheckout() {
  const paddleInstance = await initPaddle();
  paddleInstance.Checkout.close();
}
