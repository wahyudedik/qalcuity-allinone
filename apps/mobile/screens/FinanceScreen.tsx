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
import { fetchInvoices, fetchPayments, formatCurrency, formatDate, InvoiceData, PaymentData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import EmptyView from '../components/EmptyView';

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

    if (loading) return <LoadingView message="Memuat data keuangan..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;

    const renderOverview = () => (
        <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
                {summaryCards.map((card, idx) => (
                    <View key={idx} style={[styles.summaryCard, { borderLeftColor: card.color }]}>
                        <Text style={styles.summaryLabel}>{card.label}</Text>
                        <Text style={styles.summaryValue}>{card.value}</Text>
                        <Text style={styles.summaryChange}>{card.subtitle}</Text>
                    </View>
                ))}
            </View>

            {/* Recent Invoices */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Invoice Terbaru</Text>
                {invoices.length === 0 ? (
                    <EmptyView icon="📄" title="Belum ada invoice" message="Invoice akan muncul di sini" />
                ) : (
                    invoices.slice(0, 3).map((invoice) => (
                        <TouchableOpacity
                            key={invoice.id}
                            style={styles.listItem}
                            onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.listItemContent}>
                                <Text style={styles.listItemTitle}>{invoice.customerName}</Text>
                                <Text style={styles.listItemSubtitle}>{invoice.invoiceNumber} • {formatDate(invoice.createdAt)}</Text>
                            </View>
                            <View style={styles.listItemRight}>
                                <Text style={styles.listItemAmount}>{formatCurrency(invoice.amount)}</Text>
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
            {invoices.length === 0 ? (
                <EmptyView icon="📄" title="Belum ada invoice" message="Invoice akan muncul di sini" />
            ) : (
                invoices.map((invoice) => (
                    <TouchableOpacity
                        key={invoice.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('InvoiceDetail', { id: invoice.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{invoice.customerName}</Text>
                            <Text style={styles.listItemSubtitle}>{invoice.invoiceNumber} • {formatDate(invoice.createdAt)}</Text>
                        </View>
                        <View style={styles.listItemRight}>
                            <Text style={styles.listItemAmount}>{formatCurrency(invoice.amount)}</Text>
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
            {payments.length === 0 ? (
                <EmptyView icon="💳" title="Belum ada pembayaran" message="Pembayaran akan muncul di sini" />
            ) : (
                payments.map((payment) => (
                    <View key={payment.id} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{payment.customerName}</Text>
                            <Text style={styles.listItemSubtitle}>{payment.invoiceNumber} • {formatDate(payment.paymentDate)}</Text>
                        </View>
                        <View style={styles.listItemRight}>
                            <Text style={[styles.listItemAmount, { color: '#059669' }]}>+{formatCurrency(payment.amount)}</Text>
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
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'overview' ? 'Overview' : tab === 'invoices' ? 'Invoices' : 'Payments'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
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
        fontSize: 12,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 16,
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
