import api from './api.js';

export const supportService = {
  async create({ type, title, description, appVersion, platform, screenContext }) {
    const { data } = await api.post('/support/bug-reports', {
      type,
      title,
      description,
      appVersion,
      platform,
      screenContext,
    });
    return data.data;
  },
};