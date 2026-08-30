import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { fetchDashboardStats, formatCurrency, formatDate, DashboardStats } from '../lib/api';
import LoadingView from '../components/LoadingView';
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

    const statCards = [
        { id: 'revenue', title: 'Revenue', value: formatCurrency(stats?.totalRevenue || 0), change: '+12.5%', positive: true },
        { id: 'orders', title: 'Orders', value: `${stats?.totalOrders || 0}`, change: '+8.2%', positive: true },
        { id: 'customers', title: 'Customers', value: `${stats?.totalCustomers || 0}`, change: '+5.1%', positive: true },
        { id: 'products', title: 'Products', value: `${stats?.totalProducts || 0}`, change: '+3', positive: true },
    ];

    const recentInvoices = stats?.recentInvoices || [];
    const recentPayments = stats?.recentPayments || [];

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

                {/* Recent Invoices */}
                {recentInvoices.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Invoice Terbaru</Text>
                        {recentInvoices.slice(0, 3).map((invoice) => (
                            <TouchableOpacity
                                key={invoice.id}
                                style={styles.activityItem}
                                onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
                                activeOpacity={0.7}
                            >
                                <View style={styles.activityIconBadge}>
                                    <Text style={styles.activityIconText}>📄</Text>
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityTitle} numberOfLines={1}>{invoice.customerName}</Text>
                                    <Text style={styles.activityTime} numberOfLines={1}>{invoice.invoiceNumber} · {formatDate(invoice.createdAt)}</Text>
                                </View>
                                <Text style={styles.activityAmount} numberOfLines={1}>{formatCurrency(invoice.amount)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Recent Payments */}
                {recentPayments.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pembayaran Terbaru</Text>
                        {recentPayments.slice(0, 3).map((payment) => (
                            <View key={payment.id} style={styles.activityItem}>
                                <View style={[styles.activityIconBadge, styles.paymentBadge]}>
                                    <Text style={styles.activityIconText}>💳</Text>
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityTitle} numberOfLines={1}>{payment.customerName}</Text>
                                    <Text style={styles.activityTime} numberOfLines={1}>{payment.invoiceNumber} · {formatDate(payment.paymentDate)}</Text>
                                </View>
                                <Text style={[styles.activityAmount, { color: '#059669' }]} numberOfLines={1}>+{formatCurrency(payment.amount)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Empty state if no data at all */}
                {recentInvoices.length === 0 && recentPayments.length === 0 && (
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
    footer: { padding: 20, alignItems: 'center' },
    footerText: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
});
