// sw.js - Service Worker untuk HAPPY DAY Season 2
const CACHE_NAME = 'happy-day-v2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js'
];

// Install Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker: Skip Waiting');
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activated');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker: Clients Claim');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Cache First Strategy
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Push Notification Event
self.addEventListener('push', function(event) {
  console.log('Service Worker: Push Received');
  
  let notificationData = {
    title: 'HAPPY DAY Alert',
    body: 'Ada yang mendekat...',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'happy-day-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      {action: 'scream', title: '😱 Scream'},
      {action: 'hide', title: '🙈 Sembunyi'}
    ]
  };

  // Custom notification data dari server
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {...notificationData, ...data};
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Notification Clicked', event.notification.tag);
  event.notification.close();

  // Handle action buttons
  if (event.action === 'scream') {
    // Kirim perintah ke client untuk memutar suara scream
    sendMessageToClients({type: 'PLAY_SOUND', sound: 'scream'});
  } else if (event.action === 'hide') {
    // Kirim perintah untuk efek sembunyi
    sendMessageToClients({type: 'HIDE_EFFECT'});
  } else {
    // Default action - focus ke aplikasi
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(function(clientList) {
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background Sync untuk data offline
self.addEventListener('sync', function(event) {
  console.log('Service Worker: Background Sync', event.tag);
  
  if (event.tag === 'game-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Periodic Sync untuk update konten
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'content-update') {
    event.waitUntil(updateContent());
  }
});

// Fungsi untuk mengirim pesan ke semua client
function sendMessageToClients(message) {
  clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage(message);
    });
  });
}

// Background Sync Implementation
async function doBackgroundSync() {
  try {
    // Sync game progress ke server
    const gameState = await getGameState();
    await fetch('/api/sync-game', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(gameState)
    });
    console.log('Game state synced successfully');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Content Update Implementation
async function updateContent() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const updatedResources = [
      '/',
      '/index.html',
      '/styles.css'
    ];
    
    for (const resource of updatedResources) {
      try {
        const response = await fetch(resource);
        if (response.status === 200) {
          await cache.put(resource, response);
        }
      } catch (error) {
        console.warn(`Failed to update ${resource}:`, error);
      }
    }
    console.log('Content updated successfully');
  } catch (error) {
    console.error('Content update failed:', error);
  }
}

// Flash Control melalui Service Worker
self.addEventListener('message', function(event) {
  console.log('Service Worker: Message Received', event.data);
  
  const {type, data} = event.data;
  
  switch (type) {
    case 'FLASH_CONTROL':
      handleFlashControl(data);
      break;
      
    case 'NOTIFICATION_CONTROL':
      handleNotificationControl(data);
      break;
      
    case 'ALARM_CONTROL':
      handleAlarmControl(data);
      break;
      
    case 'GAME_STATE_UPDATE':
      updateGameState(data);
      break;
  }
});

// Handle Flash Control
function handleFlashControl(data) {
  const {action, pattern = [100, 50, 100, 50, 200]} = data;
  
  switch (action) {
    case 'START_FLASH':
      // Kirim perintah flash ke semua client
      sendMessageToClients({
        type: 'FLASH_START',
        pattern: pattern,
        duration: data.duration || 5000
      });
      break;
      
    case 'STOP_FLASH':
      sendMessageToClients({type: 'FLASH_STOP'});
      break;
      
    case 'PATTERN_FLASH':
      sendMessageToClients({
        type: 'FLASH_PATTERN',
        pattern: pattern,
        repeat: data.repeat || true
      });
      break;
  }
}

// Handle Notification Control
function handleNotificationControl(data) {
  const {action, title, body, delay = 0} = data;
  
  switch (action) {
    case 'SEND_NOTIFICATION':
      setTimeout(() => {
        self.registration.showNotification(title || 'HAPPY DAY', {
          body: body || 'Ada yang mendekat...',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true
        });
      }, delay);
      break;
      
    case 'SPAM_NOTIFICATIONS':
      spamNotifications(data);
      break;
  }
}

// Spam Notifications untuk efek horor
function spamNotifications(data) {
  const messages = [
    "Ada yang di belakangmu...",
    "Jangan lihat ke belakang",
    "Dia sedang mendekat",
    "Lari sekarang!",
    "Kami di dekatmu",
    "Kamu tidak sendiri",
    "Matikan lampu...",
    "Dia sudah di sini"
  ];
  
  let count = 0;
  const maxCount = data.count || 10;
  const interval = data.interval || 3000;
  
  const intervalId = setInterval(() => {
    if (count >= maxCount) {
      clearInterval(intervalId);
      return;
    }
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    self.registration.showNotification('HAPPY DAY', {
      body: randomMessage,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      tag: 'spam-notification'
    });
    
    count++;
  }, interval);
}

// Handle Alarm Control
function handleAlarmControl(data) {
  const {action, time, message} = data;
  
  switch (action) {
    case 'SET_ALARM':
      setAlarm(time, message);
      break;
      
    case 'CANCEL_ALARM':
      cancelAlarm();
      break;
  }
}

// Set Alarm Implementation
function setAlarm(time, message) {
  // Simpan alarm data untuk digunakan nanti
  const alarmData = {
    time: time,
    message: message,
    activated: false
  };
  
  // Simpan ke IndexedDB atau cache
  saveAlarmData(alarmData);
  
  // Schedule periodic check
  setInterval(() => {
    checkAlarms();
  }, 60000); // Check every minute
}

// Check Active Alarms
async function checkAlarms() {
  try {
    const alarmData = await getAlarmData();
    const now = new Date();
    const currentTime = now.getHours() + ':' + now.getMinutes();
    
    if (alarmData && alarmData.time === currentTime && !alarmData.activated) {
      // Trigger alarm
      triggerAlarm(alarmData.message);
      alarmData.activated = true;
      await saveAlarmData(alarmData);
    }
  } catch (error) {
    console.error('Error checking alarms:', error);
  }
}

// Trigger Alarm
function triggerAlarm(message) {
  // Kirim notifikasi alarm
  self.registration.showNotification('⏰ HAPPY DAY Alarm', {
    body: message || 'Waktunya alarm!',
    icon: '/icons/alarm-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [1000, 500, 1000],
    requireInteraction: true
  });
  
  // Kirim perintah ke client untuk efek alarm
  sendMessageToClients({
    type: 'ALARM_TRIGGER',
    message: message
  });
}

// Cancel Alarm
function cancelAlarm() {
  // Hapus data alarm
  deleteAlarmData();
}

// Storage functions untuk alarm data
async function saveAlarmData(data) {
  const cache = await caches.open(CACHE_NAME);
  const response = new Response(JSON.stringify(data));
  await cache.put('/alarm-data', response);
}

async function getAlarmData() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/alarm-data');
    if (response) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting alarm data:', error);
    return null;
  }
}

async function deleteAlarmData() {
  const cache = await caches.open(CACHE_NAME);
  await cache.delete('/alarm-data');
}

// Game State Management
async function updateGameState(gameState) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(gameState));
    await cache.put('/game-state', response);
    console.log('Game state saved');
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

async function getGameState() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/game-state');
    if (response) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting game state:', error);
    return null;
  }
}

// Emergency System untuk mode horor maksimal
self.addEventListener('notificationclose', function(event) {
  console.log('Service Worker: Notification Closed', event.notification.tag);
  
  // Jika notification alarm ditutup, kirim efek tambahan
  if (event.notification.tag === 'happy-day-alert') {
    sendMessageToClients({
      type: 'ALARM_FOLLOWUP',
      intensity: 'high'
    });
  }
});

// Error Handling
self.addEventListener('error', function(event) {
  console.error('Service Worker Error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('Service Worker Unhandled Rejection:', event.reason);
});

// Periodic cleanup
setInterval(async () => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader && new Date(dateHeader).getTime() < oneWeekAgo) {
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 24 * 60 * 60 * 1000); // Run once per day
