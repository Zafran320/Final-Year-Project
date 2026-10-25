if (typeof window !== "undefined") {
  if (!window.localStorage || typeof window.localStorage.clear !== "function") {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      length: 0,
    };
    Object.defineProperty(mockStorage, "length", {
      get: () => store.size,
    });
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  }

  if (!window.sessionStorage || typeof window.sessionStorage.clear !== "function") {
    const sessionStore = new Map<string, string>();
    const mockSessionStorage: Storage = {
      getItem: (key: string) => sessionStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStore.set(key, String(value));
      },
      removeItem: (key: string) => {
        sessionStore.delete(key);
      },
      clear: () => {
        sessionStore.clear();
      },
      key: (index: number) => Array.from(sessionStore.keys())[index] ?? null,
      length: 0,
    };
    Object.defineProperty(mockSessionStorage, "length", {
      get: () => sessionStore.size,
    });
    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });
  }

  if (!window.navigator.geolocation) {
    const mockGeolocation = {
      getCurrentPosition: (success: any) => {
        if (typeof success === "function") {
          success({
            coords: {
              latitude: 33.6844,
              longitude: 73.0479,
            },
          });
        }
      },
      watchPosition: () => 1,
      clearWatch: () => {},
    };
    Object.defineProperty(window.navigator, "geolocation", {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  }
}
