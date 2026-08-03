import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';

type Tab = 'products' | 'stock' | 'suppliers';

const products = [
    { id: 'SKU-001', name: 'Widget A', category: 'Electronics', price: 'Rp 100.000', stock: 150, status: 'in_stock' },
    { id: 'SKU-002', name: 'Component B', category: 'Parts', price: 'Rp 250.000', stock: 8, status: 'low_stock' },
    { id: 'SKU-003', name: 'Service C', category: 'Services', price: 'Rp 5.000.000', stock: 999, status: 'in_stock' },
    { id: 'SKU-004', name: 'Kit D', category: 'Bundles', price: 'Rp 750.000', stock: 0, status: 'out_of_stock' },
    { id: 'SKU-005', name: 'Module E', category: 'Software', price: 'Rp 2.500.000', stock: 45, status: 'in_stock' },
];

const stockAlerts = [
    { id: 'SKU-002', name: 'Component B', current: 8, minimum: 20, status: 'critical' },
    { id: 'SKU-004', name: 'Kit D', current: 0, minimum: 10, status: 'critical' },
    { id: 'SKU-007', name: 'Part G', current: 12, minimum: 15, status: 'warning' },
    { id: 'SKU-009', name: 'Widget I', current: 5, minimum: 25, status: 'critical' },
];

const suppliers = [
    { id: 'SUP-001', name: 'PT ABC Manufacturing', products: 45, leadTime: '3-5 hari', rating: 4.5 },
    { id: 'SUP-002', name: 'CV XYZ Supplies', products: 32, leadTime: '2-3 hari', rating: 4.2 },
    { id: 'SUP-003', name: 'PT Global Tech', products: 28, leadTime: '5-7 hari', rating: 4.8 },
    { id: 'SUP-004', name: 'PT Nusantara Parts', products: 18, leadTime: '1-2 hari', rating: 4.0 },
];

export default function InventoryScreen() {
    const [activeTab, setActiveTab] = useState<Tab>('products');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_stock': return '#059669';
            case 'low_stock': return '#D97706';
            case 'out_of_stock': return '#DC2626';
            case 'critical': return '#DC2626';
            case 'warning': return '#D97706';
            default: return '#6B7280';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_stock': return 'IN STOCK';
            case 'low_stock': return 'LOW STOCK';
            case 'out_of_stock': return 'OUT OF STOCK';
            case 'critical': return 'CRITICAL';
            case 'warning': return 'WARNING';
            default: return status.toUpperCase();
        }
    };

    const renderProducts = () => (
        <View style={styles.section}>
            {products.map((product) => (
                <View key={product.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                        <View style={styles.listItemHeader}>
                            <Text style={styles.listItemTitle}>{product.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(product.status) }]}>
                                    {getStatusLabel(product.status)}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listItemSubtitle}>{product.id} • {product.category}</Text>
                        <View style={styles.listItemFooter}>
                            <Text style={styles.listItemPrice}>{product.price}</Text>
                            <Text style={styles.listItemStock}>Stock: {product.stock}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderStock = () => (
        <View style={styles.section}>
            <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>⚠️ Stock Alerts</Text>
                <Text style={styles.alertSubtitle}>{stockAlerts.length} produk perlu perhatian</Text>
            </View>
            {stockAlerts.map((item) => (
                <View key={item.id} style={styles.listItem}>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{item.name}</Text>
                        <Text style={styles.listItemSubtitle}>
                            Stock: {item.current} / Minimum: {item.minimum}
                        </Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${Math.min((item.current / item.minimum) * 100, 100)}%`,
                                        backgroundColor: getStatusColor(item.status),
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderSuppliers = () => (
        <View style={styles.section}>
            {suppliers.map((supplier) => (
                <View key={supplier.id} style={styles.listItem}>
                    <View style={styles.supplierAvatar}>
                        <Text style={styles.supplierAvatarText}>{supplier.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{supplier.name}</Text>
                        <Text style={styles.listItemSubtitle}>
                            {supplier.products} produk • Lead time: {supplier.leadTime}
                        </Text>
                        <View style={styles.ratingContainer}>
                            <Text style={styles.ratingText}>⭐ {supplier.rating}</Text>
                        </View>
                    </View>
                </View>
            ))}
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

            <ScrollView style={styles.scrollView}>
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
        marginLeft: 12,
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
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    alertHeader: {
        marginBottom: 16,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    alertSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    supplierAvatar: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    supplierAvatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    ratingContainer: {
        marginTop: 4,
    },
    ratingText: {
        fontSize: 12,
        color: '#D97706',
    },
});
