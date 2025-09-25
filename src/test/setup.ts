/**
 * Test Setup Configuration
 * Global test setup for Jest and React Testing Library
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
});

// Mock Tauri API for frontend tests
const mockTauriAPI = {
  convertFileSrc: jest.fn((filePath: string) => filePath),
  invoke: jest.fn(),
};

// Mock window.__TAURI__ object
Object.defineProperty(window, '__TAURI__', {
  value: mockTauriAPI,
  writable: true,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup fake timers if needed
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.restoreAllMocks();
});

// Global test utilities
export const mockInvokeSuccess = (result: any) => {
  (mockTauriAPI.invoke as jest.Mock).mockResolvedValue(result);
};

export const mockInvokeError = (error: string) => {
  (mockTauriAPI.invoke as jest.Mock).mockRejectedValue(new Error(error));
};

export const waitForTauriCall = (command: string) => {
  return new Promise(resolve => {
    const originalInvoke = mockTauriAPI.invoke;
    (mockTauriAPI.invoke as jest.Mock).mockImplementation((cmd, ...args) => {
      if (cmd === command) {
        resolve(args);
      }
      return originalInvoke(cmd, ...args);
    });
  });
};