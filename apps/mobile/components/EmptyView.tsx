import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EmptyViewProps {
    icon?: string;
    title: string;
    message?: string;
}

export default function EmptyView({ icon = '📭', title, message }: EmptyViewProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{icon}</Text>
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
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
