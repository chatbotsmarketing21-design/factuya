import api from './api';

export const subscriptionAPI = {
  getStatus: () => api.get('/subscription/status'),
  createCheckoutSession: () => api.post('/subscription/create-checkout-session', {
    originUrl: window.location.origin
  }),
  getCheckoutStatus: (sessionId) => api.get(`/subscription/checkout-status/${sessionId}`),
  cancelSubscription: () => api.post('/subscription/cancel'),
};

export default subscriptionAPI;
