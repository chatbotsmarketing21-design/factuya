import api from './api';

export const subscriptionAPI = {
  getStatus: () => api.get('/subscription/status'),
  createCheckoutSession: () => api.post('/subscription/create-checkout-session', {
    originUrl: window.location.origin
  }),
  getCheckoutStatus: (sessionId) => api.get(`/subscription/checkout-status/${sessionId}`),
  cancelSubscription: () => api.post('/subscription/cancel'),
  
  // Wompi integration
  getWompiConfig: () => api.get('/wompi/config'),
  createWompiCheckout: (autoRenewOptIn = false, couponCode = null) => api.post('/wompi/create-checkout', {
    originUrl: window.location.origin,
    autoRenewOptIn,
    couponCode: couponCode || null,
  }),
  verifyWompiPayment: (reference) => api.get(`/wompi/verify/${reference}`),
  getWompiTransactions: () => api.get('/wompi/transactions'),

  // Wompi auto-renewal
  getAutoRenewalInfo: () => api.get('/wompi/auto-renewal-info'),
  cancelAutoRenewal: () => api.delete('/wompi/cancel-auto-renewal'),

  // Geolocation: detect user's country to choose payment gateway
  detectCountry: (forceGateway) => api.get('/geo/detect', {
    params: forceGateway ? { force_gateway: forceGateway } : {},
  }),

  // PayPal Subscriptions (international gateway)
  getPaypalConfig: () => api.get('/paypal/config'),
  createPaypalSubscription: (couponCode = null) => api.post('/paypal/create-subscription', {
    originUrl: window.location.origin,
    couponCode: couponCode || null,
  }),
  verifyPaypalSubscription: (subscriptionId) => api.get(`/paypal/verify/${subscriptionId}`),
  verifyLatestPaypalSubscription: () => api.get('/paypal/verify-latest'),
  cancelPaypalSubscription: () => api.post('/paypal/cancel'),
};

export default subscriptionAPI;
