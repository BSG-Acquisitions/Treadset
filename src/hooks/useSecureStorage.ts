import { useState, useCallback, useEffect } from 'react';

interface SecureStorageOptions<T> {
  key: string;
  defaultValue: T;
  encrypt?: boolean;
  expiresInMinutes?: number;
}

interface StoredValue<T> {
  value: T;
  timestamp: number;
  expires?: number;
}

// Simple encryption/decryption for sensitive data in localStorage
const simpleEncrypt = (text: string): string => {
  return btoa(unescape(encodeURIComponent(text)));
};

const simpleDecrypt = (encoded: string): string => {
  return decodeURIComponent(escape(atob(encoded)));
};

export const useSecureStorage = <T>({
  key,
  defaultValue,
  encrypt = false,
  expiresInMinutes
}: SecureStorageOptions<T>) => {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        let parsedItem: StoredValue<T>;
        
        if (encrypt) {
          const decrypted = simpleDecrypt(item);
          parsedItem = JSON.parse(decrypted);
        } else {
          parsedItem = JSON.parse(item);
        }

        // Check if expired
        if (parsedItem.expires && Date.now() > parsedItem.expires) {
          localStorage.removeItem(key);
          setStoredValue(defaultValue);
        } else {
          setStoredValue(parsedItem.value);
        }
      }
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      setStoredValue(defaultValue);
    } finally {
      setIsLoading(false);
    }
  }, [key, defaultValue, encrypt]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      const storageValue: StoredValue<T> = {
        value: valueToStore,
        timestamp: Date.now(),
        expires: expiresInMinutes ? Date.now() + (expiresInMinutes * 60 * 1000) : undefined
      };

      const serialized = JSON.stringify(storageValue);
      const toStore = encrypt ? simpleEncrypt(serialized) : serialized;
      
      localStorage.setItem(key, toStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, encrypt, expiresInMinutes]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  const isExpired = useCallback(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return true;

      let parsedItem: StoredValue<T>;
      if (encrypt) {
        const decrypted = simpleDecrypt(item);
        parsedItem = JSON.parse(decrypted);
      } else {
        parsedItem = JSON.parse(item);
      }

      return parsedItem.expires ? Date.now() > parsedItem.expires : false;
    } catch {
      return true;
    }
  }, [key, encrypt]);

  return {
    value: storedValue,
    setValue,
    removeValue,
    isLoading,
    isExpired
  };
};