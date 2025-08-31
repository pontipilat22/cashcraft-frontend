import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_KEY = 'app_pin_hash';
const PIN_ENABLED_KEY = 'pin_enabled';
const PIN_ATTEMPTS_KEY = 'pin_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const LOCKOUT_KEY = 'pin_lockout_until';

class PinService {
  /**
   * Hash the PIN using SHA-256
   */
  private async hashPin(pin: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
  }

  /**
   * Set up a new PIN
   */
  async setPin(pin: string): Promise<void> {
    const hashedPin = await this.hashPin(pin);
    await SecureStore.setItemAsync(PIN_KEY, hashedPin);
    await SecureStore.setItemAsync(PIN_ENABLED_KEY, 'true');
    await this.resetAttempts();
  }

  /**
   * Verify the entered PIN
   */
  async verifyPin(pin: string): Promise<boolean> {
    // Check if locked out
    const lockoutUntil = await SecureStore.getItemAsync(LOCKOUT_KEY);
    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil);
      if (Date.now() < lockoutTime) {
        throw new Error('TOO_MANY_ATTEMPTS');
      } else {
        // Lockout expired, clear it
        await SecureStore.deleteItemAsync(LOCKOUT_KEY);
      }
    }

    const storedHash = await SecureStore.getItemAsync(PIN_KEY);
    if (!storedHash) {
      return false;
    }

    const enteredHash = await this.hashPin(pin);
    const isValid = storedHash === enteredHash;

    if (isValid) {
      await this.resetAttempts();
    } else {
      await this.incrementAttempts();
    }

    return isValid;
  }

  /**
   * Check if PIN is enabled
   */
  async isPinEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
    return enabled === 'true';
  }

  /**
   * Disable PIN
   */
  async disablePin(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PIN_ENABLED_KEY);
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
    await SecureStore.deleteItemAsync(LOCKOUT_KEY);
  }

  /**
   * Change existing PIN
   */
  async changePin(currentPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.verifyPin(currentPin);
    if (isValid) {
      await this.setPin(newPin);
      return true;
    }
    return false;
  }

  /**
   * Get remaining attempts
   */
  async getRemainingAttempts(): Promise<number> {
    const attempts = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
    const attemptCount = attempts ? parseInt(attempts) : 0;
    return Math.max(0, MAX_ATTEMPTS - attemptCount);
  }

  /**
   * Check if locked out
   */
  async isLockedOut(): Promise<{ locked: boolean; remainingTime?: number }> {
    const lockoutUntil = await SecureStore.getItemAsync(LOCKOUT_KEY);
    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil);
      if (Date.now() < lockoutTime) {
        return {
          locked: true,
          remainingTime: Math.ceil((lockoutTime - Date.now()) / 1000)
        };
      }
    }
    return { locked: false };
  }

  /**
   * Reset PIN attempts
   */
  private async resetAttempts(): Promise<void> {
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
    await SecureStore.deleteItemAsync(LOCKOUT_KEY);
  }

  /**
   * Increment failed attempts
   */
  private async incrementAttempts(): Promise<void> {
    const attempts = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
    const attemptCount = attempts ? parseInt(attempts) : 0;
    const newCount = attemptCount + 1;

    await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, newCount.toString());

    if (newCount >= MAX_ATTEMPTS) {
      // Lock out the user
      const lockoutUntil = Date.now() + LOCKOUT_DURATION;
      await SecureStore.setItemAsync(LOCKOUT_KEY, lockoutUntil.toString());
    }
  }

  /**
   * Check if PIN exists (for migration or first-time setup)
   */
  async hasPinSet(): Promise<boolean> {
    const pin = await SecureStore.getItemAsync(PIN_KEY);
    return !!pin;
  }
}

export const pinService = new PinService();