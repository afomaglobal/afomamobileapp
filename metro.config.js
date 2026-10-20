const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// socket.io-client: default off — ESM subpaths break in Metro (webtransport.js).
config.resolver.unstable_enablePackageExports = false;

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // @sentry/* packages require Node "exports" resolution (disabled globally above).
  if (moduleName === '@sentry/core' || moduleName.startsWith('@sentry/')) {
    return context.resolveRequest(
      {
        ...context,
        unstable_enablePackageExports: true,
      },
      moduleName,
      platform,
    );
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
