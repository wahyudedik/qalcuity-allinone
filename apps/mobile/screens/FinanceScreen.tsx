import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';

type Tab = 'overview' | 'invoices' | 'payments';

const invoices = [
    { id: 'INV-001', customer: 'PT Maju Jaya', amount: 'Rp 15.500.000', status: 'paid', date: '15 Jul 2026' },
    { id: 'INV-002', customer: 'CV Berkah', amount: 'Rp 8.250.000', status: 'pending', date: '18 Jul 2026' },
    { id: 'INV-003', customer: 'PT Sejahtera', amount: 'Rp 23.000.000', status: 'overdue', date: '01 Jul 2026' },
    { id: 'INV-004', customer: 'PT Abadi', amount: 'Rp 5.750.000', status: 'paid', date: '20 Jul 2026' },
    { id: 'INV-005', customer: 'CV Sentosa', amount: 'Rp 12.000.000', status: 'pending', date: '22 Jul 2026' },
];

const payments = [
    { id: 'PAY-001', from: 'PT Maju Jaya', amount: 'Rp 15.500.000', date: '16 Jul 2026', method: 'Transfer' },
    { id: 'PAY-002', customer: 'PT Abadi', amount: 'Rp 5.750.000', date: '21 Jul 2026', method: 'QRIS' },
    { id: 'PAY-003', from: 'CV Berkah', amount: 'Rp 4.000.000', date: '25 Jul 2026', method: 'Transfer' },
];

export default function FinanceScreen() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#059669';
            case 'pending': return '#D97706';
            case 'overdue': return '#DC2626';
            default: return '#6B7280';
        }
    };

    const renderOverview = () => (
        <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { borderLeftColor: '#2563EB' }]}>
                    <Text style={styles.summaryLabel}>Total Revenue</Text>
                    <Text style={styles.summaryValue}>Rp 125.5 Jt</Text>
                    <Text style={[styles.summaryChange, { color: '#059669' }]}>↑ 12.5%</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}>
                    <Text style={styles.summaryLabel}>Paid</Text>
                    <Text style={styles.summaryValue}>Rp 85.2 Jt</Text>
                    <Text style={styles.summaryChange}>68% dari total</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#D97706' }]}>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={styles.summaryValue}>Rp 25.7 Jt</Text>
                    <Text style={styles.summaryChange}>20% dari total</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#DC2626' }]}>
                    <Text style={styles.summaryLabel}>Overdue</Text>
                    <Text style={styles.summaryValue}>Rp 14.6 Jt</Text>
                    <Text style={styles.summaryChange}>12% dari total</Text>
                </View>
            </View>

            {/* Recent Invoices */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Invoice Terbaru</Text>
                {invoices.slice(0, 3).map((invoice) => (
                    <View key={invoice.id} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{invoice.customer}</Text>
                            <Text style={styles.listItemSubtitle}>{invoice.id} • {invoice.date}</Text>
                        </View>
                        <View style={styles.listItemRight}>
                            <Text style={styles.listItemAmount}>{invoice.amount}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                    {invoice.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </>
    );

    const renderInvoices = () => (
        <View style={styles.section}>
            {invoices.map((invoice) => (
                <View key={invoice.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{invoice.customer}</Text>
                        <Text style={styles.listItemSubtitle}>{invoice.id} • {invoice.date}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                        <Text style={styles.listItemAmount}>{invoice.amount}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                {invoice.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderPayments = () => (
        <View style={styles.section}>
            {payments.map((payment) => (
                <View key={payment.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{payment.from}</Text>
                        <Text style={styles.listItemSubtitle}>{payment.id} • {payment.date}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                        <Text style={[styles.listItemAmount, { color: '#059669' }]}>+{payment.amount}</Text>
                        <Text style={styles.paymentMethod}>{payment.method}</Text>
                    </View>
                </View>
            ))}
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

            <ScrollView style={styles.scrollView}>
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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 4,
    },
    summaryChange: {
        fontSize: 11,
        marginTop: 2,
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 16,
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
        justifyContent: 'space-between',
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
        color: '#6B7280',
        marginTop: 4,
    },
});
