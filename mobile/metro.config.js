// Configuración de Metro. Necesitamos mapear `punycode` (módulo "core" de Node que
// markdown-it importa) al paquete de npm, porque React Native no trae los builtins.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve("punycode/"),
};

module.exports = config;
