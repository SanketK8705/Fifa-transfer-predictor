import axios from 'axios';

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const api = axios.create({
  baseURL: isLocal
    ? 'http://localhost:5000/api'
    : 'https://fifa-transfer-predictor.onrender.com/api',
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

export async function askAssistant(message) {
  const { data } = await api.post('/assistant', { message });
  return data.response;
}

export default api;