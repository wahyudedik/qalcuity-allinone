/**
 * RegisterScreen — Mobile Authentication Register
 * 
 * Provides registration form for new mobile users.
 * Creates both a new user account and a new tenant (company).
 * 
 * Features:
 * - Full name, email, password, company name fields
 * - Form validation (required fields, email format, password length)
 * - Loading state during registration
 * - Error display with dismiss option
 * - Link to login screen
 * - Keyboard-friendly layout
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../lib/auth-context';

interface RegisterScreenProps {
    navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
    const { register, isAuthenticating, error, clearError } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const isFormValid =
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        password.length >= 8 &&
        companyName.trim().length > 0;

    const handleRegister = async () => {
        if (!isFormValid) return;

        try {
            await register(
                name.trim(),
                email.trim().toLowerCase(),
                password,
                companyName.trim()
            );
        } catch (err) {
            // Error is handled by auth context
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>Q</Text>
                    <Text style={styles.title}>Qalcuity</Text>
                    <Text style={styles.subtitle}>Buat Akun Baru</Text>
                </View>

                {/* Error Message */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={clearError}>
                            <Text style={styles.errorDismiss}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.formTitle}>Daftar Sekarang</Text>

                    {/* Company Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nama Perusahaan</Text>
                        <TextInput
                            style={styles.input}
                            value={companyName}
                            onChangeText={(text) => {
                                setCompanyName(text);
                                if (error) clearError();
                            }}
                            placeholder="PT Nama Perusahaan"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="words"
                            editable={!isAuthenticating}
                        />
                    </View>

                    {/* Full Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nama Lengkap</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                if (error) clearError();
                            }}
                            placeholder="John Doe"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="words"
                            autoComplete="name"
                            editable={!isAuthenticating}
                        />
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (error) clearError();
                            }}
                            placeholder="email@perusahaan.com"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            editable={!isAuthenticating}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (error) clearError();
                                }}
                                placeholder="Minimal 8 karakter"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="new-password"
                                editable={!isAuthenticating}
                            />
                            <TouchableOpacity
                                style={styles.passwordToggle}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.passwordToggleText}>
                                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {password.length > 0 && password.length < 8 && (
                            <Text style={styles.hint}>
                                Password minimal 8 karakter ({password.length}/8)
                            </Text>
                        )}
                    </View>

                    {/* Register Button */}
                    <TouchableOpacity
                        style={[
                            styles.button,
                            (!isFormValid || isAuthenticating) && styles.buttonDisabled,
                        ]}
                        onPress={handleRegister}
                        disabled={!isFormValid || isAuthenticating}
                    >
                        {isAuthenticating ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.buttonText}>Daftar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Login Link */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Sudah punya akun? </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        disabled={isAuthenticating}
                    >
                        <Text style={styles.footerLink}>Masuk</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#2563EB',
        width: 80,
        height: 80,
        textAlign: 'center',
        lineHeight: 80,
        backgroundColor: '#EFF6FF',
        borderRadius: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    errorContainer: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: {
        color: '#DC2626',
        fontSize: 14,
        flex: 1,
    },
    errorDismiss: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
    },
    form: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    passwordToggle: {
        marginLeft: 8,
        padding: 12,
    },
    passwordToggleText: {
        color: '#2563EB',
        fontSize: 12,
        fontWeight: '500',
    },
    hint: {
        color: '#F59E0B',
        fontSize: 12,
        marginTop: 4,
    },
    button: {
        backgroundColor: '#2563EB',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#93C5FD',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#6B7280',
        fontSize: 14,
    },
    footerLink: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '600',
    },
});
