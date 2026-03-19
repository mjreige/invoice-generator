import { initializePaddle } from '@paddle/paddle-js';

let paddle: any = null;

export async function initPaddle() {
  if (paddle) return paddle;

  try {
    const environment = (process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox').trim() as 'sandbox' | 'production';
    const token = (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'test_3251d959f441592a6abb85e50b6').trim();

    console.log('DEBUG paddle - environment:', environment);
    console.log('DEBUG paddle - token:', token ? 'present' : 'missing');
    console.log('DEBUG paddle - token value:', token.substring(0, 10) + '...');

    paddle = await initializePaddle({
      environment: environment,
      token: token,
      debug: environment === 'sandbox',
      eventCallback: function(data: any) {
        console.log('DEBUG paddle - event:', data.name, data);
        if (data.name === 'checkout.completed') {
          console.log('DEBUG paddle - checkout completed, redirecting...');
          window.location.href = window.location.origin + '/invoice';
        }
      }
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
    paddleInstance.Checkout.close();
  } catch (error) {
    console.error('Failed to close checkout:', error);
  }
}