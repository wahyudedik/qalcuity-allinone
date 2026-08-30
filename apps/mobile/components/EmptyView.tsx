import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EmptyViewProps {
    icon?: string;
    title: string;
    message?: string;
}

export default function EmptyView({ icon, title, message }: EmptyViewProps) {
    return (
        <View style={styles.container}>
            {icon ? (
                <Text style={styles.icon}>{icon}</Text>
            ) : (
                <View style={styles.iconPlaceholder}>
                    <Text style={styles.iconPlaceholderText}>📭</Text>
                </View>
            )}
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 40,
        minHeight: 200,
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    iconPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconPlaceholderText: {
        fontSize: 28,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
});
