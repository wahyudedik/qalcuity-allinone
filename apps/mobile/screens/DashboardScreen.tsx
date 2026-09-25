import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { fetchDashboardStats, formatCurrency, DashboardStats } from '../lib/api';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorView from '../components/ErrorView';
import EmptyView from '../components/EmptyView';

type DashboardScreenProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
    navigation: DashboardScreenProp;
}

const quickActions = [
    { id: 'invoice', icon: '📄', title: 'Buat Invoice', screen: 'Finance' as const },
    { id: 'lead', icon: '🎯', title: 'Kelola Lead', screen: 'CRM' as const },
    { id: 'product', icon: '📦', title: 'Kelola Produk', screen: 'Inventory' as const },
    { id: 'employee', icon: '👤', title: 'Kelola Karyawan', screen: 'HR' as const },
];

/** Format a percentage change with sign and color hint */
function formatChange(value: number): { text: string; positive: boolean } {
    if (value > 0) return { text: `+${value}%`, positive: true };
    if (value < 0) return { text: `${value}%`, positive: false };
    return { text: '0%', positive: true };
}

export default function DashboardScreen({ navigation }: Props) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            setError(null);
            const data = await fetchDashboardStats();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    if (loading) return <LoadingSkeleton variant="stats" />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;

    // Compute stat cards from actual API response
    const revenueChange = formatChange(stats?.revenue?.change ?? 0);
    const dealsChange = formatChange(stats?.dealsWon?.change ?? 0);
    const leadsChange = formatChange(stats?.newLeads?.change ?? 0);
    const expensesChange = formatChange(stats?.expenses?.change ?? 0);

    const statCards = [
        {
            id: 'revenue',
            title: 'Revenue Bulan Ini',
            value: formatCurrency(stats?.revenue?.current || 0),
            change: revenueChange.text,
            positive: revenueChange.positive,
        },
        {
            id: 'deals',
            title: 'Deals Aktif',
            value: `${stats?.activeDeals || 0}`,
            change: `${stats?.dealsWon?.current || 0} won`,
            positive: true,
        },
        {
            id: 'leads',
            title: 'Lead Baru',
            value: `${stats?.newLeads?.current || 0}`,
            change: leadsChange.text,
            positive: leadsChange.positive,
        },
        {
            id: 'products',
            title: 'Total Produk',
            value: `${stats?.products?.total || 0}`,
            change: `${stats?.products?.lowStock || 0} low stock`,
            positive: (stats?.products?.lowStock || 0) === 0,
        },
    ];

    const recentActivities = stats?.recentActivities || [];
    const alerts = stats?.alerts || [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {statCards.map((stat) => (
                        <View key={stat.id} style={styles.statCard}>
                            <Text style={styles.statTitle} numberOfLines={1}>{stat.title}</Text>
                            <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
                            <Text style={[styles.statChange, stat.positive ? styles.positive : styles.negative]}>
                                {stat.change}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionCard}
                                onPress={() => navigation.navigate(action.screen)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.actionIcon}>{action.icon}</Text>
                                <Text style={styles.actionTitle} numberOfLines={1}>{action.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Alerts */}
                {alerts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Peringatan</Text>
                        {alerts.slice(0, 5).map((alert) => (
                            <View
                                key={alert.id}
                                style={[styles.activityItem, alert.type === 'danger' ? styles.alertDanger : styles.alertWarning]}
                            >
                                <View style={[styles.activityIconBadge, alert.type === 'danger' ? styles.alertDangerBadge : styles.alertWarningBadge]}>
                                    <Text style={styles.activityIconText}>{alert.type === 'danger' ? '🔴' : '⚠️'}</Text>
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityTitle} numberOfLines={1}>{alert.title}</Text>
                                    <Text style={styles.activityTime} numberOfLines={2}>{alert.message}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Recent Activities */}
                {recentActivities.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
                        {recentActivities.slice(0, 5).map((activity) => (
                            <View key={activity.id} style={styles.activityItem}>
                                <View style={styles.activityIconBadge}>
                                    <Text style={styles.activityIconText}>📋</Text>
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
                                    <Text style={styles.activityTime} numberOfLines={1}>{activity.description}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Empty state if no data at all */}
                {recentActivities.length === 0 && alerts.length === 0 && (
                    <View style={styles.section}>
                        <EmptyView title="Belum ada aktivitas" message="Aktivitas terbaru akan muncul di sini" />
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Qalcuity v1.0.0</Text>
                    <Text style={styles.footerText}>© 2026 Qalcuity. All rights reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    scrollView: { flex: 1 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, justifyContent: 'space-between' },
    statCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, width: '48%', marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    statTitle: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    statChange: { fontSize: 12, marginTop: 4 },
    positive: { color: '#059669' },
    negative: { color: '#DC2626' },
    section: { paddingHorizontal: 16, paddingTop: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    actionCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, width: '48%', marginBottom: 12, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    actionIcon: { fontSize: 28, marginBottom: 8 },
    actionTitle: { fontSize: 13, fontWeight: '500', color: '#111827', textAlign: 'center' },
    activityItem: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center',
        borderLeftWidth: 0, borderLeftColor: 'transparent',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    activityIconBadge: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    paymentBadge: { backgroundColor: '#ECFDF5' },
    activityIconText: { fontSize: 18 },
    activityContent: { flex: 1 },
    activityTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
    activityTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    activityAmount: { fontSize: 13, fontWeight: '600', color: '#111827' },
    alertDanger: { borderLeftColor: '#DC2626' },
    alertWarning: { borderLeftColor: '#D97706' },
    alertDangerBadge: { backgroundColor: '#FEF2F2' },
    alertWarningBadge: { backgroundColor: '#FFFBEB' },
    footer: { padding: 20, alignItems: 'center' },
    footerText: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
});
