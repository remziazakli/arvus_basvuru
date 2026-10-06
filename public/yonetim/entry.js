// Keep the portal and Firebase's auth helper on the same origin before login.
// Only the team portal moves; recruitment pages and auth callbacks stay put.
export function portalDestination(href) {
  const url = new URL(href);
  if (url.hostname !== 'arvus-basvuru.web.app' ||
      !['/yonetim', '/yonetim/', '/yonetim/index.html'].includes(url.pathname)) return null;
  url.protocol = 'https:';
  url.hostname = 'arvus-basvuru.firebaseapp.com';
  url.port = '';
  return url.href;
}

if (typeof window !== 'undefined') {
  const destination = portalDestination(window.location.href);
  if (destination) window.location.replace(destination);
  else import('./app.js?v=3').catch(() => {
    document.getElementById('auth-message').textContent =
      'Panel yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.';
  });
}
