import api from './api';

export const searchProducts = (payload) =>
  api.post('/search', payload).then((r) => r.data);

export const getProductHistory = (id, params) =>
  api.get(`/products/${id}/history`, { params }).then((r) => r.data);

export const getBestValue = (id) =>
  api.get(`/products/${id}/best-value`).then((r) => r.data);

export const getReviewSummary = (id) =>
  api.get(`/products/${id}/reviews-summary`).then((r) => r.data);

export const getProduct = (id) =>
  api.get(`/products/${id}`).then((r) => r.data);

export const getFeaturedProducts = () =>
  api.get('/products?limit=12').then((r) => r.data);
