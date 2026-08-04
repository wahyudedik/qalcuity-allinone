import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorViewProps {
    message: string;
    onRetry?: () => void;
}

export default function ErrorView({ message, onRetry }: ErrorViewProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Terjadi Kesalahan</Text>
            <Text style={styles.message}>{message}</Text>
            {onRetry && (
                <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
                    <Text style={styles.retryText}>Coba Lagi</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 20,
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
