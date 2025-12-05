import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Настройка обработчика уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Запрос разрешений на уведомления
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Для Android нужно настроить канал
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6E76',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

// Планирование еженедельного уведомления
export async function scheduleWeeklyReminder(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Отменяем предыдущие уведомления
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Массив различных сообщений для разнообразия
    const messages = [
      {
        title: 'Time to Mix the Dough!',
        body: 'Create a new crypto portfolio and discover amazing coins!',
      },
      {
        title: 'Discover New Coins!',
        body: 'Explore trending cryptocurrencies and learn about DeFi, NFTs, and more!',
      },
      {
        title: 'Don\'t Break Your Streak!',
        body: 'Mix your dough this week to keep your progress alive!',
      },
      {
        title: 'Check Your Progress!',
        body: 'You\'re doing great! See your achievements and unlock new flavors!',
      },
      {
        title: 'New Portfolio Ideas!',
        body: 'Generate a fresh crypto portfolio and see what the market has to offer!',
      },
    ];

    // Выбираем случайное сообщение
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Планируем уведомление через 7 дней в 10:00
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: randomMessage.title,
        body: randomMessage.body,
        sound: true,
        data: { type: 'weekly_reminder' },
      },
      trigger: {
        date: nextWeek,
        repeats: true,
        seconds: 604800, // 7 дней в секундах
      },
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling weekly reminder:', error);
    return null;
  }
}


// Инициализация всех уведомлений (теперь только еженедельное)
export async function initializeNotifications(): Promise<void> {
  try {
    await scheduleWeeklyReminder();
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

// Отмена всех уведомлений
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

