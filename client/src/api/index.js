import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

export const fetchFixtures = () =>
  api.get('/fixtures').then(r => r.data);

export const fetchLiveFixtures = () =>
  api.get('/fixtures/live').then(r => r.data);

export const fetchFixture = (id) =>
  api.get(`/fixtures/${id}`).then(r => r.data);

export const fetchEngine = (id) =>
  api.get(`/engine/${id}`).then(r => r.data);

export const fetchLiveStatus = () =>
  api.get('/live/status').then(r => r.data);

export const fetchOdds = (eventId) =>
  api.get(`/odds/${eventId}`).then(r => r.data);

export const fetchOddsMovements = (eventId) =>
  api.get(`/odds/${eventId}/movements`).then(r => r.data);

export const fetchGroups = () =>
  api.get('/groups').then(r => r.data);

export default api;
