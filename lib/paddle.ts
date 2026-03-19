import { initializePaddle } from '@paddle/paddle-js';

let paddle: any = null;

export async function initPaddle() {
  if (paddle) return paddle;

  try {
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production';
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    
    console.log('DEBUG paddle - environment:', environment);
    console.log('DEBUG paddle - token:', token ? 'present' : 'missing');
    
    if (!token) {
      throw new Error('PADDLE_CLIENT_TOKEN is missing');
    }

    paddle = await initializePaddle({
      environment: environment,
      token: token,
      debug: environment === 'sandbox',
    });

    console.log('DEBUG paddle - initialized successfully');
    return paddle;
  } catch (error) {
    console.error('Failed to initialize Paddle:', error);
    throw error;
  }
}

export async function openCheckout(priceId: string, userEmail: string, userId: string) {
  try {
    const paddleInstance = await initPaddle();
    
    const checkoutParams = {
      items: [{ priceId: priceId, quantity: 1 }],
      customer: {
        email: userEmail,
      },
      customData: {
        userId: userId,
      },
      successUrl: `${window.location.origin}/invoice`,
    };
    
    console.log('DEBUG paddle - opening checkout with params:', checkoutParams);
    
    await paddleInstance.Checkout.open(checkoutParams);
    console.log('DEBUG paddle - checkout opened successfully');
  } catch (error) {
    console.error('Failed to open checkout:', error);
    throw error;
  }
}

export async function closeCheckout() {
  try {
    const paddleInstance = await initPaddle();
    console.log('DEBUG paddle - closing checkout');
    paddleInstance.Checkout.close();
  } catch (error) {
    console.error('Failed to close checkout:', error);
  }
}
