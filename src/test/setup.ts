import '@testing-library/jest-dom';

// Mock crypto for tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: async (_algorithm: string, data: ArrayBuffer) => {
        // Simple mock hash for testing
        const view = new Uint8Array(data);
        const hash = new Uint8Array(32);
        for (let i = 0; i < view.length; i++) {
          hash[i % 32] ^= view[i];
        }
        return hash.buffer;
      },
    },
  },
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock IndexedDB
const indexedDBMock = {
  open: () => ({
    result: {
      objectStoreNames: { contains: () => false },
      createObjectStore: () => ({}),
      transaction: () => ({
        objectStore: () => ({
          put: () => ({ onsuccess: null, onerror: null }),
          get: () => ({ onsuccess: null, onerror: null, result: null }),
          delete: () => ({ onsuccess: null, onerror: null }),
        }),
      }),
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  }),
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
}

Object.defineProperty(window, 'ResizeObserver', {
  value: ResizeObserverMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { /* noop */ },
    removeListener: () => { /* noop */ },
    addEventListener: () => { /* noop */ },
    removeEventListener: () => { /* noop */ },
    dispatchEvent: () => false,
  }),
});

// Export for use in test files
export { localStorageMock };
