import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ScreenMode } from '../App';
import {
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    formatCurrency,
    MobileProduct,
    CreateProductPayload,
    UpdateProductPayload,
} from '../lib/api';
import { ProductForm } from '../components/forms';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
    route: RouteProp<RootStackParamList, 'ProductDetail'>;
};

export default function ProductDetailScreen({ navigation, route }: Props) {
    const { id, mode: initialMode } = route.params || {};
    const [mode, setMode] = useState<ScreenMode>(initialMode || (id ? 'view' : 'create'));
    const [product, setProduct] = useState<MobileProduct | null>(null);
    const [loading, setLoading] = useState(mode === 'view' && !!id);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        if (!id) return;
        try {
            setError(null);
            setLoading(true);
            const data = await getProduct(id);
            setProduct(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat produk');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'view' && id) {
            loadData();
        }
    }, [id, mode]);

    const handleSave = async (data: CreateProductPayload | UpdateProductPayload) => {
        setSaving(true);
        try {
            if (mode === 'create') {
                await createProduct(data as CreateProductPayload);
                Alert.alert('Berhasil', 'Produk berhasil dibuat');
            } else if (mode === 'edit' && id) {
                await updateProduct(id, data as UpdateProductPayload);
                Alert.alert('Berhasil', 'Produk berhasil diperbarui');
            }
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menyimpan produk');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Hapus Produk',
            'Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        if (!id) return;
                        try {
                            setSaving(true);
                            await deleteProduct(id);
                            Alert.alert('Berhasil', 'Produk berhasil dihapus');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menghapus produk');
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
            case 'in_stock': return '#059669';
            case 'low_stock': return '#D97706';
            case 'out_of_stock': return '#DC2626';
            default: return '#6B7280';
        }
    };

    const getStockStatus = (p: MobileProduct) => {
        if (p.stock === 0) return 'out_of_stock';
        if (p.stock <= p.minStock) return 'low_stock';
        return 'in_stock';
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_stock': return 'IN STOCK';
            case 'low_stock': return 'LOW STOCK';
            case 'out_of_stock': return 'OUT OF STOCK';
            default: return status.toUpperCase();
        }
    };

    // ─── Edit / Create Mode ──────────────────────────────────────────────────
    if (mode === 'edit' || mode === 'create') {
        return (
            <SafeAreaView style={styles.container}>
                <ProductForm
                    initialData={mode === 'edit' ? product || undefined : undefined}
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
    if (loading) return <LoadingView message="Memuat detail produk..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!product) return <ErrorView message="Produk tidak ditemukan" />;

    const stockStatus = getStockStatus(product);

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
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{product.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(stockStatus) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(stockStatus) }]}>
                                {getStatusLabel(stockStatus)}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.price}>{formatCurrency(product.price)}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Produk</Text>
                    <InfoRow label="SKU" value={product.sku} />
                    <InfoRow label="Kategori" value={product.categoryName || '-'} />
                    <InfoRow label="Satuan" value={product.unit} />
                    <InfoRow label="Harga" value={formatCurrency(product.price)} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Stok</Text>
                    <InfoRow label="Stok Saat Ini" value={`${product.stock} ${product.unit}`} />
                    <InfoRow label="Stok Minimum" value={`${product.minStock} ${product.unit}`} />
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${Math.min((product.stock / Math.max(product.minStock, 1)) * 100, 100)}%`,
                                    backgroundColor: getStatusColor(stockStatus),
                                },
                            ]}
                        />
                    </View>
                    {product.isLowStock && (
                        <View style={styles.alertBanner}>
                            <Text style={styles.alertText}>
                                Stok {product.stock === 0 ? 'habis' : 'menipis'}! Perlu reorder.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
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
    headerCard: { backgroundColor: '#059669', borderRadius: 12, padding: 16, marginBottom: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
    price: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 12, fontWeight: '600' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: '#6B7280' },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
    progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    alertBanner: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginTop: 12 },
    alertText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
});
