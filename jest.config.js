const path = require('path')
const { defaults } = require('jest-config')

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  preset: 'ts-jest',
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'mjs'],
  testEnvironment: path.join(
    __dirname,
    'prisma',
    'prisma-test-environment.mjs'
  ),
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Map the @ alias to the src directory
  },
}

module.exports = config
