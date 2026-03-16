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
  createWompiCheckout: () => api.post('/wompi/create-checkout', {
    originUrl: window.location.origin
  }),
  verifyWompiPayment: (reference) => api.get(`/wompi/verify/${reference}`),
  getWompiTransactions: () => api.get('/wompi/transactions'),
};

export default subscriptionAPI;
