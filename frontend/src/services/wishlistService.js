import api from './api';

export const addToWishlist    = (data)   => api.post('/wishlist', data).then((r) => r.data);
export const getWishlist      = (userId) => api.get(`/wishlist/${userId}`).then((r) => r.data);
export const removeWishlist   = (itemId) => api.delete(`/wishlist/${itemId}`).then((r) => r.data);
export const updateThreshold  = (itemId, data) =>
  api.patch(`/wishlist/${itemId}`, data).then((r) => r.data);
