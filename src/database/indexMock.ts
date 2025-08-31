// Заглушка для базы данных для работы в Expo Go
console.log('Mock: database module loaded');

const database = {
  // Моковые методы для базы данных
  get: () => null,
  collections: {
    get: () => ({
      find: () => null,
      create: () => null,
      query: () => [],
    })
  },
  write: async (callback: any) => {
    if (typeof callback === 'function') {
      return callback();
    }
  },
  read: async (callback: any) => {
    if (typeof callback === 'function') {
      return callback();
    }
  }
};

export default database;
