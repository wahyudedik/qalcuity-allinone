import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { fetchInvoiceDetail, formatCurrency, formatDate, InvoiceDetailData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    route: RouteProp<RootStackParamList, 'InvoiceDetail'>;
};

export default function InvoiceDetailScreen({ route }: Props) {
    const { id } = route.params;
    const [invoice, setInvoice] = useState<InvoiceDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const data = await fetchInvoiceDetail(id);
            setInvoice(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat invoice');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#059669';
            case 'pending': return '#D97706';
            case 'overdue': return '#DC2626';
            default: return '#6B7280';
        }
    };

    if (loading) return <LoadingView message="Memuat detail invoice..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!invoice) return <ErrorView message="Invoice tidak ditemukan" />;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                {invoice.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.totalAmount}>{formatCurrency(invoice.total)}</Text>
                </View>

                {/* Customer Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Pelanggan</Text>
                    <InfoRow label="Nama" value={invoice.customerName} />
                    <InfoRow label="Email" value={invoice.customerEmail} />
                    <InfoRow label="Telepon" value={invoice.customerPhone} />
                    <InfoRow label="Alamat" value={invoice.customerAddress} />
                </View>

                {/* Items */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Items</Text>
                    {invoice.items.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemDesc}>{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
                            </View>
                            <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
                        </View>
                    ))}
                    <View style={styles.divider} />
                    <InfoRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
                    <InfoRow label="PPN (10%)" value={formatCurrency(invoice.tax)} />
                    <View style={styles.divider} />
                    <InfoRow label="Total" value={formatCurrency(invoice.total)} bold />
                </View>

                {/* Dates */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tanggal</Text>
                    <InfoRow label="Dibuat" value={formatDate(invoice.createdAt)} />
                    <InfoRow label="Jatuh Tempo" value={formatDate(invoice.dueDate)} />
                </View>

                {/* Notes */}
                {invoice.notes ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Catatan</Text>
                        <Text style={styles.notesText}>{invoice.notes}</Text>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, bold && styles.infoValueBold]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    scrollView: { flex: 1, padding: 16 },
    headerCard: {
        backgroundColor: '#2563EB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    invoiceNumber: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
    totalAmount: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 12, fontWeight: '600' },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    infoLabel: { fontSize: 13, color: '#6B7280' },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
    infoValueBold: { fontWeight: '700', fontSize: 15 },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 13, fontWeight: '600', color: '#111827' },
    itemDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    itemTotal: { fontSize: 13, fontWeight: '600', color: '#111827' },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
    notesText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
