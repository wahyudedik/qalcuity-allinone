/**
 * Auth Context — React Context for Mobile Authentication
 * 
 * Provides authentication state and methods to the entire app.
 * 
 * Features:
 * - User state management
 * - Login / Register / Logout functions
 * - Auto-load stored auth on app start
 * - Token refresh handling
 * - Loading state during auth operations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    MobileUser,
    loginAPI,
    registerAPI,
    logoutAPI,
    getStoredUser,
    getStoredToken,
    getMeAPI,
    AuthError,
} from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
    /** Current authenticated user (null if not authenticated) */
    user: MobileUser | null;
    /** Whether auth state is being loaded (e.g., checking stored token) */
    isLoading: boolean;
    /** Whether an auth operation (login/register) is in progress */
    isAuthenticating: boolean;
    /** Last error message from auth operation */
    error: string | null;
    /** Login with email and password */
    login: (email: string, password: string) => Promise<void>;
    /** Register new user */
    register: (
        name: string,
        email: string,
        password: string,
        companyName: string
    ) => Promise<void>;
    /** Logout and clear all auth data */
    logout: () => Promise<void>;
    /** Clear any auth error message */
    clearError: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<MobileUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Load user from stored token on app startup.
     * Verifies token is still valid by calling /mobile/auth/me.
     */
    const loadStoredAuth = useCallback(async () => {
        try {
            const token = await getStoredToken();
            if (!token) {
                setIsLoading(false);
                return;
            }

            // Verify token is still valid
            const currentUser = await getMeAPI();
            setUser(currentUser);
        } catch (err) {
            // Token invalid or expired — clear stored data
            console.log('[Auth] Stored token invalid, clearing...');
            await logoutAPI();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load stored auth on mount
    useEffect(() => {
        loadStoredAuth();
    }, [loadStoredAuth]);

    /**
     * Login with email and password.
     * On success, stores tokens and sets user state.
     */
    const login = useCallback(async (email: string, password: string) => {
        setIsAuthenticating(true);
        setError(null);

        try {
            const result = await loginAPI(email, password);
            setUser(result.user);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login gagal';
            setError(message);
            throw err;
        } finally {
            setIsAuthenticating(false);
        }
    }, []);

    /**
     * Register new user.
     * On success, stores tokens and sets user state.
     */
    const register = useCallback(async (
        name: string,
        email: string,
        password: string,
        companyName: string
    ) => {
        setIsAuthenticating(true);
        setError(null);

        try {
            const result = await registerAPI(name, email, password, companyName);
            setUser(result.user);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registrasi gagal';
            setError(message);
            throw err;
        } finally {
            setIsAuthenticating(false);
        }
    }, []);

    /**
     * Logout and clear all auth data.
     */
    const logout = useCallback(async () => {
        await logoutAPI();
        setUser(null);
        setError(null);
    }, []);

    /**
     * Clear error message.
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticating,
        error,
        login,
        register,
        logout,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Custom hook to access auth context.
 * Must be used within AuthProvider.
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
