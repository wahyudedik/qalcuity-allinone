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
import { fetchInvoices, fetchPayments, formatCurrency, formatDate, InvoiceData, PaymentData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorView from '../components/ErrorView';
import EmptyView from '../components/EmptyView';
import SearchBar from '../components/SearchBar';

type Tab = 'overview' | 'invoices' | 'payments';
type FinanceScreenProp = NativeStackNavigationProp<RootStackParamList, 'Finance'>;

interface Props {
    navigation: FinanceScreenProp;
}

export default function FinanceScreen({ navigation }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [invoices, setInvoices] = useState<InvoiceData[]>([]);
    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const loadData = async () => {
        try {
            setError(null);
            const [invoicesData, paymentsData] = await Promise.all([
                fetchInvoices().catch(() => []),
                fetchPayments().catch(() => []),
            ]);
            setInvoices(invoicesData);
            setPayments(paymentsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data');
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#059669';
            case 'pending': return '#D97706';
            case 'overdue': return '#DC2626';
            case 'sent': return '#2563EB';
            default: return '#6B7280';
        }
    };

    // Filtered invoices
    const filteredInvoices = useMemo(() => {
        let result = invoices;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (inv) =>
                    inv.customerName?.toLowerCase().includes(q) ||
                    inv.invoiceNumber?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'all') {
            result = result.filter((inv) => inv.status === statusFilter);
        }
        return result;
    }, [invoices, searchQuery, statusFilter]);

    // Filtered payments
    const filteredPayments = useMemo(() => {
        if (!searchQuery) return payments;
        const q = searchQuery.toLowerCase();
        return payments.filter(
            (p) =>
                p.customerName?.toLowerCase().includes(q) ||
                p.invoiceNumber?.toLowerCase().includes(q) ||
                p.method?.toLowerCase().includes(q)
        );
    }, [payments, searchQuery]);

    // Calculate summary from real data
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const summaryCards = [
        { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: '#2563EB', subtitle: `${invoices.length} invoice` },
        { label: 'Paid', value: formatCurrency(paidAmount), color: '#059669', subtitle: `${invoices.filter(i => i.status === 'paid').length} invoice` },
        { label: 'Pending', value: formatCurrency(pendingAmount), color: '#D97706', subtitle: `${invoices.filter(i => i.status === 'pending').length} invoice` },
        { label: 'Overdue', value: formatCurrency(overdueAmount), color: '#DC2626', subtitle: `${invoices.filter(i => i.status === 'overdue').length} invoice` },
    ];

    const statusFilters = [
        { label: 'Semua', value: 'all' },
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Sent', value: 'sent' },
    ];

    if (loading) return <LoadingSkeleton variant="stats" />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;

    const renderOverview = () => (
        <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
                {summaryCards.map((card, idx) => (
                    <View key={idx} style={[styles.summaryCard, { borderLeftColor: card.color }]}>
                        <Text style={styles.summaryLabel} numberOfLines={1}>{card.label}</Text>
                        <Text style={styles.summaryValue} numberOfLines={1}>{card.value}</Text>
                        <Text style={styles.summaryChange} numberOfLines={1}>{card.subtitle}</Text>
                    </View>
                ))}
            </View>

            {/* Recent Invoices */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Invoice Terbaru</Text>
                {invoices.length === 0 ? (
                    <EmptyView title="Belum ada invoice" message="Invoice akan muncul di sini" />
                ) : (
                    invoices.slice(0, 3).map((invoice) => (
                        <TouchableOpacity
                            key={invoice.id}
                            style={styles.listItem}
                            onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.listItemContent}>
                                <Text style={styles.listItemTitle} numberOfLines={1}>{invoice.customerName}</Text>
                                <Text style={styles.listItemSubtitle} numberOfLines={1}>{invoice.invoiceNumber} · {formatDate(invoice.createdAt)}</Text>
                            </View>
                            <View style={styles.listItemRight}>
                                <Text style={styles.listItemAmount} numberOfLines={1}>{formatCurrency(invoice.amount)}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                        {invoice.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </>
    );

    const renderInvoices = () => (
        <View style={styles.section}>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari invoice..."
                filterOptions={statusFilters}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />
            {filteredInvoices.length === 0 ? (
                <EmptyView title="Tidak ada invoice" message={searchQuery ? 'Tidak ditemukan invoice yang sesuai' : 'Invoice akan muncul di sini'} />
            ) : (
                filteredInvoices.map((invoice) => (
                    <TouchableOpacity
                        key={invoice.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle} numberOfLines={1}>{invoice.customerName}</Text>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>{invoice.invoiceNumber} · {formatDate(invoice.createdAt)}</Text>
                        </View>
                        <View style={styles.listItemRight}>
                            <Text style={styles.listItemAmount} numberOfLines={1}>{formatCurrency(invoice.amount)}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                    {invoice.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const renderPayments = () => (
        <View style={styles.section}>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari pembayaran..."
            />
            {filteredPayments.length === 0 ? (
                <EmptyView title="Tidak ada pembayaran" message={searchQuery ? 'Tidak ditemukan pembayaran yang sesuai' : 'Pembayaran akan muncul di sini'} />
            ) : (
                filteredPayments.map((payment) => (
                    <View key={payment.id} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle} numberOfLines={1}>{payment.customerName}</Text>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>{payment.invoiceNumber} · {formatDate(payment.paymentDate)}</Text>
                        </View>
                        <View style={styles.listItemRight}>
                            <Text style={[styles.listItemAmount, { color: '#059669' }]} numberOfLines={1}>+{formatCurrency(payment.amount)}</Text>
                            <Text style={styles.paymentMethod}>{payment.method}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {(['overview', 'invoices', 'payments'] as Tab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => { setActiveTab(tab); setSearchQuery(''); setStatusFilter('all'); }}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'overview' ? 'Ringkasan' : tab === 'invoices' ? 'Invoice' : 'Pembayaran'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'invoices' && renderInvoices()}
                {activeTab === 'payments' && renderPayments()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#2563EB',
    },
    tabText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#2563EB',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        justifyContent: 'space-between',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        width: '48%',
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 11,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 4,
    },
    summaryChange: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    section: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    listItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    listItemSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    listItemRight: {
        alignItems: 'flex-end',
    },
    listItemAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    paymentMethod: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
});
