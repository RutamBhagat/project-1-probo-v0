export default {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset for ts-jest
  globals: {
    'ts-jest': {
      useESM: true, // Enable ESM in ts-jest
    },
  },
  testEnvironment: 'node', // Make sure you're using a Node environment
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
