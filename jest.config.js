/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-worklets)',
  ],
  collectCoverageFrom: [
    'src/lib/route-guard.ts',
    'src/stores/session-store.ts',
    'src/stores/decision-queue-store.ts',
    'src/api/mock-creator-profile.ts',
    'src/api/mock-deals.ts',
    'components/NavigationBootstrap.tsx',
  ],
};
