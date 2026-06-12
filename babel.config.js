module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Metro web bundles are classic scripts; transform import.meta (e.g. zustand devtools).
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};
