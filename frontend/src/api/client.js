import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export async function predictPlayer(payload, sessionId) {
  const { data } = await api.post('/predict', { ...payload, session_id: sessionId });
  return data;
}

export async function getFamousPlayers() {
  const { data } = await api.get('/players/famous');
  return data.players;
}

export async function searchPlayers(query) {
  if (!query || query.trim().length < 2) return [];
  const { data } = await api.get('/players/search', { params: { q: query } });
  return data.players;
}

export async function getPositions() {
  const { data } = await api.get('/players/positions');
  return data.positions;
}

export async function getAnalysisData() {
  const { data } = await api.get('/analysis');
  return data;
}

export async function getScores() {
  const { data } = await api.get('/scores');
  return data;
}

export async function getHistory(sessionId) {
  const { data } = await api.get('/history', { params: { session_id: sessionId } });
  return data.history;
}

export async function deleteHistoryItem(predictionId) {
  const { data } = await api.delete(`/history/${predictionId}`);
  return data;
}

export async function clearHistory(sessionId) {
  const { data } = await api.delete('/history/clear', { params: { session_id: sessionId } });
  return data;
}

export default api;