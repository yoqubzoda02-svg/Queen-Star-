// Service worker for background push notifications (Firebase Cloud Messaging).
// Must live at the site root (Vite copies files from /public as-is) so the
// browser can register it with scope "/". Uses the compat SDK via importScripts
// because service workers can't use ES module imports the way src/firebase.js does.
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDJhzTbbLbGXvNB0U1-uYPfU59IYbOOKEo",
  authDomain:        "queen-star.firebaseapp.com",
  projectId:         "queen-star",
  storageBucket:     "queen-star.firebasestorage.app",
  messagingSenderId: "127291008287",
  appId:             "1:127291008287:web:b72bed65534fe34b25fc2a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Queen Star', {
    body: body || '',
    icon: '/icon-192.png',
  });
});
