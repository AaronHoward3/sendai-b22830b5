export const API_ROOT = '/api';

// Ensures exactly one /api prefix and exactly one slash
export function apiPath(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_ROOT}${p}`.replace(/\/{2,}/g, '/');
}
