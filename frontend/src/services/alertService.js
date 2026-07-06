import api from './api';

export const getAlerts = (userId) =>
  api.get(`/alerts/${userId}`).then((r) => r.data);
