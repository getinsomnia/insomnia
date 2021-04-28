'use strict';

// @ts-check
/** @type { import('@jest/types').Config.InitialOptions } */
module.exports = {
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: ['.+\\.test\\.ts$'],
  collectCoverage: false,
  resetMocks: true,
  resetModules: true,
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageReporters: ['text-summary', 'lcov'],
};