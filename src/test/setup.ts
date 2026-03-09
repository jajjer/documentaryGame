import '@testing-library/jest-dom';

// jsdom may not have a full localStorage; provide a minimal mock
const storage = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
    get length() { return storage.size; },
    key: (i: number) => [...storage.keys()][i] ?? null,
  },
  writable: true,
});
