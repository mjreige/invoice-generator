import { initializePaddle } from '@paddle/paddle-js';

let paddle: any = null;

export async function initPaddle() {
  if (paddle) return paddle;

  const environment = (process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox').trim() as 'sandbox' | 'production';
  const token = (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '').trim();

  paddle = await initializePaddle({
    environment,
    token,
    debug: false,
    eventCallback: function(data: any) {
      if (data.name === 'checkout.completed') {
        // Redirect to home with welcome flag — use Next.js router to avoid full reload
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
