import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface LoadingSkeletonProps {
    rows?: number;
    variant?: 'card' | 'list' | 'stats';
}

function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
    return (
        <View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius: 8,
                    backgroundColor: '#E5E7EB',
                    overflow: 'hidden',
                },
                style,
            ]}
        />
    );
}

export default function LoadingSkeleton({ rows = 3, variant = 'list' }: LoadingSkeletonProps) {
    if (variant === 'stats') {
        return (
            <View style={styles.container}>
                <View style={styles.statsGrid}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.statCard}>
                            <SkeletonBlock width="60%" height={12} />
                            <SkeletonBlock width="80%" height={20} style={{ marginTop: 8 }} />
                            <SkeletonBlock width="40%" height={12} style={{ marginTop: 6 }} />
                        </View>
                    ))}
                </View>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.listItem}>
                        <SkeletonBlock width={40} height={40} />
                        <View style={styles.listContent}>
                            <SkeletonBlock width="70%" height={14} />
                            <SkeletonBlock width="50%" height={12} style={{ marginTop: 6 }} />
                        </View>
                        <SkeletonBlock width={60} height={14} />
                    </View>
                ))}
            </View>
        );
    }

    if (variant === 'card') {
        return (
            <View style={styles.container}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.card}>
                        <SkeletonBlock width="100%" height={20} />
                        <SkeletonBlock width="80%" height={14} style={{ marginTop: 8 }} />
                        <SkeletonBlock width="60%" height={14} style={{ marginTop: 6 }} />
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {Array.from({ length: rows }).map((_, i) => (
                <View key={i} style={styles.listItem}>
                    <SkeletonBlock width={40} height={40} />
                    <View style={styles.listContent}>
                        <SkeletonBlock width="70%" height={14} />
                        <SkeletonBlock width="50%" height={12} style={{ marginTop: 6 }} />
                    </View>
                    <SkeletonBlock width={60} height={14} />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F3F4F6',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        marginBottom: 12,
    },
    listItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    listContent: {
        flex: 1,
        marginLeft: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
});
