import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ScreenMode } from '../App';
import {
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    formatCurrency,
    formatDate,
    MobileInvoice,
    CreateInvoicePayload,
    UpdateInvoicePayload,
} from '../lib/api';
import { InvoiceForm } from '../components/forms';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'InvoiceDetail'>;
    route: RouteProp<RootStackParamList, 'InvoiceDetail'>;
};

export default function InvoiceDetailScreen({ navigation, route }: Props) {
    const { id, mode: initialMode } = route.params || {};
    const [mode, setMode] = useState<ScreenMode>(initialMode || (id ? 'view' : 'create'));
    const [invoice, setInvoice] = useState<MobileInvoice | null>(null);
    const [loading, setLoading] = useState(mode === 'view' && !!id);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        if (!id) return;
        try {
            setError(null);
            setLoading(true);
            const data = await getInvoice(id);
            setInvoice(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat invoice');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'view' && id) {
            loadData();
        }
    }, [id, mode]);

    const handleSave = async (data: CreateInvoicePayload | UpdateInvoicePayload) => {
        setSaving(true);
        try {
            if (mode === 'create') {
                await createInvoice(data as CreateInvoicePayload);
                Alert.alert('Berhasil', 'Invoice berhasil dibuat');
            } else if (mode === 'edit' && id) {
                await updateInvoice(id, data as UpdateInvoicePayload);
                Alert.alert('Berhasil', 'Invoice berhasil diperbarui');
            }
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menyimpan invoice');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Hapus Invoice',
            'Apakah Anda yakin ingin menghapus invoice ini? Tindakan ini tidak dapat dibatalkan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        if (!id) return;
                        try {
                            setSaving(true);
                            await deleteInvoice(id);
                            Alert.alert('Berhasil', 'Invoice berhasil dihapus');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menghapus invoice');
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = () => {
        setMode('edit');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#059669';
            case 'pending': return '#D97706';
            case 'overdue': return '#DC2626';
            case 'sent': return '#2563EB';
            case 'draft': return '#6B7280';
            default: return '#6B7280';
        }
    };

    // ─── Edit / Create Mode ──────────────────────────────────────────────────
    if (mode === 'edit' || mode === 'create') {
        return (
            <SafeAreaView style={styles.container}>
                <InvoiceForm
                    initialData={mode === 'edit' ? invoice || undefined : undefined}
                    onSubmit={handleSave}
                    onCancel={() => {
                        if (mode === 'edit' && id) {
                            setMode('view');
                        } else {
                            navigation.goBack();
                        }
                    }}
                    isLoading={saving}
                />
            </SafeAreaView>
        );
    }

    // ─── View Mode ───────────────────────────────────────────────────────────
    if (loading) return <LoadingView message="Memuat detail invoice..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!invoice) return <ErrorView message="Invoice tidak ditemukan" />;

    return (
        <SafeAreaView style={styles.container}>
            {/* Action Buttons */}
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.editButton} onPress={handleEdit} activeOpacity={0.7}>
                    <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
                    <Text style={styles.deleteButtonText}>Hapus</Text>
                </TouchableOpacity>
            </View>

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
                    <InfoRow label="Nama" value={invoice.customerName || '-'} />
                    <InfoRow label="ID Pelanggan" value={invoice.contactId || '-'} />
                </View>

                {/* Items */}
                {invoice.items && invoice.items.length > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Items</Text>
                        {invoice.items.map((item, idx) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.description}</Text>
                                    <Text style={styles.itemDesc}>{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
                                </View>
                                <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
                            </View>
                        ))}
                        <View style={styles.divider} />
                        <InfoRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
                        <InfoRow label="PPN" value={formatCurrency(invoice.tax)} />
                        <View style={styles.divider} />
                        <InfoRow label="Total" value={formatCurrency(invoice.total)} bold />
                    </View>
                ) : null}

                {/* Dates */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tanggal</Text>
                    <InfoRow label="Dibuat" value={formatDate(invoice.createdAt)} />
                    <InfoRow label="Jatuh Tempo" value={invoice.dueDate ? formatDate(invoice.dueDate) : '-'} />
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
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
        gap: 8,
    },
    editButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    deleteButtonText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
    },
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
