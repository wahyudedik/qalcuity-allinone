import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorViewProps {
    message: string;
    onRetry?: () => void;
}

export default function ErrorView({ message, onRetry }: ErrorViewProps) {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Text style={styles.iconText}>!</Text>
            </View>
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
        minHeight: 300,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#DC2626',
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
        marginBottom: 20,
        lineHeight: 20,
        paddingHorizontal: 20,
    },
    retryButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
