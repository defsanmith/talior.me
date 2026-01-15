/**
 * localStorage utility for persisting user preferences
 */

export const storage = {
  /**
   * Get a value from localStorage with type safety
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The stored value or default value
   */
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === "undefined") return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Set a value in localStorage
   * @param key - The storage key
   * @param value - The value to store
   */
  set: (key: string, value: any): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
    }
  },

  /**
   * Remove a value from localStorage
   * @param key - The storage key
   */
  remove: (key: string): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  },
};

// Storage keys used throughout the app
export const StorageKeys = {
  JOBS_VIEW: "tailor_jobs_view",
  JOBS_SORT: "tailor_jobs_sort",
} as const;
