const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for dotenv
config.resolver.alias = {
  ...config.resolver.alias,
  '@': './src',
};

module.exports = config;
