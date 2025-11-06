
const CACHE_NAME = 'james-assistant-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/components/Sidebar.tsx',
  '/components/ChatView.tsx',
  '/services/geminiService.ts',
  '/utils/audioUtils.ts',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  'https://cdn.tailwindcss.com',
  'https://rsms.me/inter/inter.css',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/@google/genai@^1.28.0',
  'https://aistudiocdn.com/lucide-react@^0.552.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/uuid@^13.0.0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
