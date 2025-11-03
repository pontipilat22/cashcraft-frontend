const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push('cjs');

// Более агрессивный фикс для путей с кириллицей
const originalServerEnhanceMiddleware = defaultConfig.server.enhanceMiddleware;

defaultConfig.server.enhanceMiddleware = (middleware, server) => {
  return (req, res, next) => {
    // Сохраняем оригинальный setHeader
    const originalSetHeader = res.setHeader.bind(res);
    
    // Переопределяем setHeader для ВСЕХ заголовков
    res.setHeader = function(name, value) {
      try {
        // Если это заголовок с путями и содержит кириллицу
        if (typeof value === 'string' && /[а-яА-Я]/.test(value)) {
          // Для критичных заголовков с путями - пропускаем
          if (name === 'X-React-Native-Project-Root' || 
              name === 'X-Metro-Files-Changed' ||
              name === 'X-Metro-File-Map') {
            return this;
          }
          // Для других заголовков - пытаемся закодировать
          value = encodeURIComponent(value);
        }
        
        return originalSetHeader(name, value);
      } catch (error) {
        // Полностью игнорируем ошибки заголовков
        return this;
      }
    };
    
    // Вызываем оригинальный middleware если он был
    if (originalServerEnhanceMiddleware) {
      return originalServerEnhanceMiddleware(middleware, server)(req, res, next);
    }
    
    return middleware(req, res, next);
  };
};

// Переопределяем projectRoot чтобы избежать проблем
defaultConfig.projectRoot = __dirname;

module.exports = defaultConfig;
