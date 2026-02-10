import api from './api';

export const subscriptionAPI = {
  getStatus: () => api.get('/subscription/status'),
  createCheckoutSession: (data) => api.post('/subscription/create-checkout-session', data),
  cancelSubscription: () => api.post('/subscription/cancel'),
};

export default subscriptionAPI;