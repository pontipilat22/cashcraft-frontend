const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Use regular victory implementation when building for Expo web
  config.resolve.alias['victory-native'] = 'victory';

  return config;
};
