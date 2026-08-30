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
import { fetchProducts, fetchSuppliers, formatCurrency, ProductData, SupplierData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorView from '../components/ErrorView';
import EmptyView from '../components/EmptyView';
import SearchBar from '../components/SearchBar';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

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

    const getProductStatus = (product: ProductData) => {
        if (product.status) return product.status;
        if (product.stock === 0) return 'out_of_stock';
        if (product.stock <= product.minStock) return 'low_stock';
        return 'in_stock';
    };

    // Compute stock alerts from real products
    const stockAlerts = products.filter(p => p.stock <= p.minStock);

    // Filtered products
    const filteredProducts = useMemo(() => {
        let result = products;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name?.toLowerCase().includes(q) ||
                    p.sku?.toLowerCase().includes(q) ||
                    p.category?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'all') {
            result = result.filter((p) => getProductStatus(p) === statusFilter);
        }
        return result;
    }, [products, searchQuery, statusFilter]);

    // Filtered suppliers
    const filteredSuppliers = useMemo(() => {
        if (!searchQuery) return suppliers;
        const q = searchQuery.toLowerCase();
        return suppliers.filter(
            (s) => s.name?.toLowerCase().includes(q)
        );
    }, [suppliers, searchQuery]);

    // Filtered stock alerts
    const filteredStockAlerts = useMemo(() => {
        if (!searchQuery) return stockAlerts;
        const q = searchQuery.toLowerCase();
        return stockAlerts.filter(
            (p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
        );
    }, [stockAlerts, searchQuery]);

    const productStatusFilters = [
        { label: 'Semua', value: 'all' },
        { label: 'In Stock', value: 'in_stock' },
        { label: 'Low Stock', value: 'low_stock' },
        { label: 'Out of Stock', value: 'out_of_stock' },
    ];

    if (loading) return <LoadingSkeleton variant="list" rows={5} />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;

    const renderProducts = () => (
        <View style={styles.section}>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari produk..."
                filterOptions={productStatusFilters}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />
            {filteredProducts.length === 0 ? (
                <EmptyView title="Tidak ada produk" message={searchQuery ? 'Tidak ditemukan produk yang sesuai' : 'Produk akan muncul di sini'} />
            ) : (
                filteredProducts.map((product) => (
                    <TouchableOpacity
                        key={product.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.listItemContent}>
                            <View style={styles.listItemHeader}>
                                <Text style={styles.listItemTitle} numberOfLines={1}>{product.name}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(getProductStatus(product)) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(getProductStatus(product)) }]}>
                                        {getStatusLabel(getProductStatus(product))}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>{product.sku} · {product.category}</Text>
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
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari produk..."
            />
            <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>Stock Alerts</Text>
                <Text style={styles.alertSubtitle}>{filteredStockAlerts.length} produk perlu perhatian</Text>
            </View>
            {filteredStockAlerts.length === 0 ? (
                <EmptyView title="Stok aman" message={searchQuery ? 'Tidak ditemukan produk yang sesuai' : 'Tidak ada produk yang perlu perhatian'} />
            ) : (
                filteredStockAlerts.map((item) => (
                    <View key={item.id} style={styles.listItem}>
                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.stock === 0 ? 'out_of_stock' : 'low_stock') }]} />
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>
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
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari supplier..."
            />
            {filteredSuppliers.length === 0 ? (
                <EmptyView title="Tidak ada supplier" message={searchQuery ? 'Tidak ditemukan supplier yang sesuai' : 'Supplier akan muncul di sini'} />
            ) : (
                filteredSuppliers.map((supplier) => (
                    <View key={supplier.id} style={styles.listItem}>
                        <View style={styles.supplierAvatar}>
                            <Text style={styles.supplierAvatarText}>{supplier.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle} numberOfLines={1}>{supplier.name}</Text>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>
                                {supplier.products} produk · Rating: {supplier.rating}
                            </Text>
                            <View style={styles.ratingContainer}>
                                <Text style={styles.ratingText}>★ {supplier.rating}</Text>
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
                        onPress={() => { setActiveTab(tab); setSearchQuery(''); setStatusFilter('all'); }}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'products' ? 'Produk' : tab === 'stock' ? 'Stok' : 'Supplier'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
                showsVerticalScrollIndicator={false}
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
