// Expo resolves the "@/*" alias from tsconfig.json paths via @expo/metro-config,
// so no module-resolver plugin is needed here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
