/**
 * It takes a string as an argument and returns the value of the key in localStorage
 * @param key - The key of the item you want to get from localStorage
 * @returns The value of the key in localStorage.
 */
export function getStorage<T>(key: string): T | null {
  const value = localStorage.getItem(key);
  return value !== null ? JSON.parse(value) : null;
}

/**
 * It takes a string as an argument and returns the value of the key in sessionStorage
 * @param key - The key of the item you want to get from sessionStorage
 * @returns The value of the key in sessionStorage.
 */
export function getSession<T>(key: string): T | null {
  const value = sessionStorage.getItem(key);
  return value !== null ? JSON.parse(value) : null;
}
/**
 * This function takes a key and a value, and sets the value in localStorage with the key.
 * @param key - The key to store the value under
 * @param value - The value to be stored in localStorage
 */
export function setStorage(key: string, value: any): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Delete the localStorage information
 * @param key - The key of the item to be deleted from localStorage
 */
export const deleteStorage = async (key: string): Promise<void> => {
  localStorage.removeItem(key);
};

/**
 * This function takes a key and a value, and sets the value in sessionStorage.
 * @param key - The key to store the value under.
 * @param value - The value to be stored in sessionStorage
 */
export function setSession(key: string, value: any): void {
  sessionStorage.setItem(key, JSON.stringify(value));
}

/**
 * Delete the sessionStorage information
 * @param key - The key of the item to be deleted from sessionStorage
 */
export const deleteSession = async (key: string): Promise<void> => {
  sessionStorage.removeItem(key);
};
