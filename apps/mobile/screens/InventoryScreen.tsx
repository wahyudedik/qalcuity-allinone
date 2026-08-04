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
import { fetchProducts, fetchSuppliers, formatCurrency, ProductData, SupplierData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import EmptyView from '../components/EmptyView';

type Tab = 'products' | 'stock' | 'suppliers';
type InventoryScreenProp = NativeStackNavigationProp<RootStackParamList, 'Inventory'>;

interface Props {
    navigation: InventoryScreenProp;
}

export default function InventoryScreen({ navigation }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('products');
    const [products, setProducts] = useState<ProductData[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            setError(null);
            const [productsData, suppliersData] = await Promise.all([
                fetchProducts().catch(() => []),
                fetchSuppliers().catch(() => []),
            ]);
            setProducts(productsData);
            setSuppliers(suppliersData);
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
            case 'in_stock': return '#059669';
            case 'low_stock': return '#D97706';
            case 'out_of_stock': return '#DC2626';
            case 'critical': return '#DC2626';
            case 'warning': return '#D97706';
            case 'active': return '#059669';
            case 'inactive': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_stock': return 'IN STOCK';
            case 'low_stock': return 'LOW STOCK';
            case 'out_of_stock': return 'OUT OF STOCK';
            default: return status.toUpperCase();
        }
    };

    // Compute stock alerts from real products
    const stockAlerts = products.filter(p => p.stock <= p.minStock);

    if (loading) return <LoadingView message="Memuat data inventory..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;

    const renderProducts = () => (
        <View style={styles.section}>
            {products.length === 0 ? (
                <EmptyView icon="📦" title="Belum ada produk" message="Produk akan muncul di sini" />
            ) : (
                products.map((product) => (
                    <TouchableOpacity
                        key={product.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.listItemContent}>
                            <View style={styles.listItemHeader}>
                                <Text style={styles.listItemTitle}>{product.name}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status || (product.stock > 0 ? 'in_stock' : 'out_of_stock')) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(product.status || (product.stock > 0 ? 'in_stock' : 'out_of_stock')) }]}>
                                        {getStatusLabel(product.status || (product.stock > 0 ? 'in_stock' : 'out_of_stock'))}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.listItemSubtitle}>{product.sku} • {product.category}</Text>
                            <View style={styles.listItemFooter}>
                                <Text style={styles.listItemPrice}>{formatCurrency(product.price)}</Text>
                                <Text style={styles.listItemStock}>Stock: {product.stock}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const renderStock = () => (
        <View style={styles.section}>
            <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>⚠️ Stock Alerts</Text>
                <Text style={styles.alertSubtitle}>{stockAlerts.length} produk perlu perhatian</Text>
            </View>
            {stockAlerts.length === 0 ? (
                <EmptyView icon="✅" title="Stok aman" message="Tidak ada produk yang perlu perhatian" />
            ) : (
                stockAlerts.map((item) => (
                    <View key={item.id} style={styles.listItem}>
                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.stock === 0 ? 'out_of_stock' : 'low_stock') }]} />
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{item.name}</Text>
                            <Text style={styles.listItemSubtitle}>
                                Stock: {item.stock} / Minimum: {item.minStock}
                            </Text>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${Math.min((item.stock / Math.max(item.minStock, 1)) * 100, 100)}%`,
                                            backgroundColor: getStatusColor(item.stock === 0 ? 'out_of_stock' : 'low_stock'),
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderSuppliers = () => (
        <View style={styles.section}>
            {suppliers.length === 0 ? (
                <EmptyView icon="🏭" title="Belum ada supplier" message="Supplier akan muncul di sini" />
            ) : (
                suppliers.map((supplier) => (
                    <View key={supplier.id} style={styles.listItem}>
                        <View style={styles.supplierAvatar}>
                            <Text style={styles.supplierAvatarText}>{supplier.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{supplier.name}</Text>
                            <Text style={styles.listItemSubtitle}>
                                {supplier.products} produk • Rating: {supplier.rating}
                            </Text>
                            <View style={styles.ratingContainer}>
                                <Text style={styles.ratingText}>⭐ {supplier.rating}</Text>
                            </View>
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
                {(['products', 'stock', 'suppliers'] as Tab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
            >
                {activeTab === 'products' && renderProducts()}
                {activeTab === 'stock' && renderStock()}
                {activeTab === 'suppliers' && renderSuppliers()}
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
    section: {
        paddingHorizontal: 16,
        paddingTop: 16,
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
    listItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    listItemSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    listItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    listItemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563EB',
    },
    listItemStock: {
        fontSize: 12,
        color: '#6B7280',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    statusIndicator: {
        width: 4,
        height: '100%',
        borderRadius: 2,
        marginRight: 12,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    alertHeader: {
        marginBottom: 12,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    alertSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    supplierAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    supplierAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4F46E5',
    },
    ratingContainer: {
        marginTop: 4,
    },
    ratingText: {
        fontSize: 12,
        color: '#D97706',
    },
});
