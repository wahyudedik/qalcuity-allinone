/**
 * Expo Environment Type Declarations
 *
 * Declares EXPO_PUBLIC_* env vars available at build time via Metro bundler.
 * These are injected automatically by Expo SDK 49+ when EXPO_PUBLIC_* vars are set.
 */

// Declare process.env for EXPO_PUBLIC_* variables (Expo SDK 49+)
// This avoids needing @types/node which can conflict with React Native types
declare const process: {
    env: {
        EXPO_PUBLIC_API_URL?: string;
        [key: string]: string | undefined;
    };
};
