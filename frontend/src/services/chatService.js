import api from './api';

export const sendChatMessage = (data) =>
  api.post('/chat', data).then((r) => r.data);
