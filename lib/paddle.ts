import { initializePaddle } from '@paddle/paddle-js';

let paddle: any = null;

export async function initPaddle() {
  if (paddle) return paddle;

  try {
    paddle = await initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      debug: process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox',
    });

    return paddle;
  } catch (error) {
    console.error('Failed to initialize Paddle:', error);
    throw error;
  }
}

export async function openCheckout(priceId: string, userEmail: string, userId: string) {
  try {
    const paddleInstance = await initPaddle();
    
    await paddleInstance.Checkout.open({
      items: [{ priceId: priceId, quantity: 1 }],
      customer: {
        email: userEmail,
      },
      customData: {
        userId: userId,
      },
    });
  } catch (error) {
    console.error('Failed to open checkout:', error);
    throw error;
  }
}

export async function closeCheckout() {
  try {
    const paddleInstance = await initPaddle();
    paddleInstance.Checkout.close();
  } catch (error) {
    console.error('Failed to close checkout:', error);
  }
}
