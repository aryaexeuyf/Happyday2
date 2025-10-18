// Service Worker untuk notifikasi
self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : 'Hallo saya disini, kami di dekat mu, kamu di mana?',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">👁️</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">👁️</text></svg>',
        vibrate: [200, 100, 200],
        tag: 'happy-day-alert',
        renotify: true,
        requireInteraction: true
    };
    
    event.waitUntil(
        self.registration.showNotification('HAPPY DAY Season 2', options)
    );
});

// Background sync untuk alarm
self.addEventListener('sync', function(event) {
    if (event.tag === 'alarm-sync') {
        event.waitUntil(checkAlarm());
    }
});

function checkAlarm() {
    return new Promise((resolve) => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        if ((hour === 19 && minute === 30) || (hour === 6 && minute === 0)) {
            self.registration.showNotification('HAPPY DAY Alert', {
                body: hour === 19 ? 'BERSEMBUNYI CEPAT! Monster-monster lepas!' : 'Alarm dimatikan...',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">👁️</text></svg>',
                vibrate: [500, 200, 500],
                tag: 'alarm-notification'
            });
        }
        
        resolve();
    });
}
