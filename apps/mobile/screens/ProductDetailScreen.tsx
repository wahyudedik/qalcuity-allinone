import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { fetchProducts, formatCurrency, ProductData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    route: RouteProp<RootStackParamList, 'ProductDetail'>;
};

export default function ProductDetailScreen({ route }: Props) {
    const { id } = route.params;
    const [product, setProduct] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const products = await fetchProducts();
            const found = products.find(p => p.id === id);
            setProduct(found || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat produk');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_stock': return '#059669';
            case 'low_stock': return '#D97706';
            case 'out_of_stock': return '#DC2626';
            default: return '#6B7280';
        }
    };

    const getStockStatus = (p: ProductData) => {
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

    if (loading) return <LoadingView message="Memuat detail produk..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!product) return <ErrorView message="Produk tidak ditemukan" />;

    const stockStatus = getStockStatus(product);

    return (
        <SafeAreaView style={styles.container}>
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
                    <InfoRow label="Kategori" value={product.category} />
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
                    {product.stock <= product.minStock && (
                        <View style={styles.alertBanner}>
                            <Text style={styles.alertText}>
                                ⚠️ Stok {product.stock === 0 ? 'habis' : 'menipis'}! Perlu reorder.
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
