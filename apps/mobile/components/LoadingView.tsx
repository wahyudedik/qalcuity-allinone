import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingViewProps {
    message?: string;
}

export default function LoadingView({ message = 'Memuat data...' }: LoadingViewProps) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.message}>{message}</Text>
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
        minHeight: 200,
    },
    message: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
});
