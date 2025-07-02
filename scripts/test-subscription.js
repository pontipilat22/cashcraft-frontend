const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const testSubscription = async () => {
  console.log('🔍 Testing subscription functionality...\n');

  try {
    // Получаем текущего пользователя
    const currentUser = await AsyncStorage.getItem('currentUser');
    console.log('📱 Current user:', currentUser);

    if (!currentUser) {
      console.log('❌ No user logged in');
      return;
    }

    // Проверяем ключ подписки
    const subscriptionKey = `subscription_${currentUser}`;
    console.log('🔑 Subscription key:', subscriptionKey);

    // Получаем текущую подписку
    const subscription = await AsyncStorage.getItem(subscriptionKey);
    console.log('\n📋 Current subscription:', subscription);

    if (subscription) {
      const sub = JSON.parse(subscription);
      const endDate = new Date(sub.endDate);
      const now = new Date();
      
      console.log('\n📅 Subscription details:');
      console.log('  - Plan:', sub.planName);
      console.log('  - Start date:', new Date(sub.startDate).toLocaleDateString());
      console.log('  - End date:', endDate.toLocaleDateString());
      console.log('  - Days left:', Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      console.log('  - Is active:', endDate > now);
    } else {
      console.log('❌ No subscription found');
    }

    // Показываем все ключи в AsyncStorage для отладки
    console.log('\n🗂️ All AsyncStorage keys:');
    const keys = await AsyncStorage.getAllKeys();
    keys.forEach(key => {
      if (key.includes('subscription')) {
        console.log('  -', key);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Функция для создания тестовой подписки
const createTestSubscription = async () => {
  console.log('\n✨ Creating test subscription...\n');

  try {
    const currentUser = await AsyncStorage.getItem('currentUser');
    if (!currentUser) {
      console.log('❌ No user logged in');
      return;
    }

    const subscription = {
      planId: 'monthly',
      planName: 'Месячная подписка',
      price: '₽199',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      userId: currentUser,
    };

    const subscriptionKey = `subscription_${currentUser}`;
    await AsyncStorage.setItem(subscriptionKey, JSON.stringify(subscription));
    
    console.log('✅ Test subscription created successfully!');
    console.log('📋 Subscription:', JSON.stringify(subscription, null, 2));
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
  }
};

// Функция для удаления подписки
const removeSubscription = async () => {
  console.log('\n🗑️ Removing subscription...\n');

  try {
    const currentUser = await AsyncStorage.getItem('currentUser');
    if (!currentUser) {
      console.log('❌ No user logged in');
      return;
    }

    const subscriptionKey = `subscription_${currentUser}`;
    await AsyncStorage.removeItem(subscriptionKey);
    
    console.log('✅ Subscription removed successfully!');
  } catch (error) {
    console.error('❌ Error removing subscription:', error);
  }
};

// Запуск тестов
const runTests = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'create':
      await createTestSubscription();
      break;
    case 'remove':
      await removeSubscription();
      break;
    case 'check':
    default:
      await testSubscription();
      break;
  }
};

runTests(); 