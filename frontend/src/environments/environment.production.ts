export const environment = {
  production: true,
  apiBaseUrl: 'https://api.stickyfingers.me',
  // SockJS exige esquema http(s), NO ws/wss (el upgrade lo negocia SockJS internamente).
  wsUrl: 'https://api.stickyfingers.me/ws',
};
