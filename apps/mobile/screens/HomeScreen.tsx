import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type HomeScreenProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
    navigation: HomeScreenProp;
}

const menuItems = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        subtitle: 'Overview bisnis Anda',
        icon: '📊',
        screen: 'Dashboard' as const,
        color: '#2563EB',
    },
    {
        id: 'finance',
        title: 'Finance',
        subtitle: 'Invoice, pembayaran, & keuangan',
        icon: '💰',
        screen: 'Finance' as const,
        color: '#059669',
    },
    {
        id: 'crm',
        title: 'Sales & CRM',
        subtitle: 'Leads, kontak, & pipeline',
        icon: '📈',
        screen: 'CRM' as const,
        color: '#D97706',
    },
    {
        id: 'inventory',
        title: 'Inventory',
        subtitle: 'Produk, stok, & supplier',
        icon: '📦',
        screen: 'Inventory' as const,
        color: '#7C3AED',
    },
    {
        id: 'hr',
        title: 'HR & People',
        subtitle: 'Karyawan, absensi, & payroll',
        icon: '👥',
        screen: 'HR' as const,
        color: '#DC2626',
    },
];

export default function HomeScreen({ navigation }: Props) {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light" backgroundColor="#2563EB" />
            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>Qalcuity</Text>
                    <Text style={styles.tagline}>All-in-One B2B SaaS</Text>
                </View>

                {/* Welcome Card */}
                <View style={styles.welcomeCard}>
                    <Text style={styles.welcomeTitle}>Selamat Datang! 👋</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Kelola bisnis Anda dengan lebih cerdas dan efisien
                    </Text>
                </View>

                {/* Menu Grid */}
                <View style={styles.menuGrid}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.menuCard, { borderLeftColor: item.color }]}
                            onPress={() => navigation.navigate(item.screen)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.menuIcon}>{item.icon}</Text>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <Text style={styles.statsTitle}>Quick Stats</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>Rp 45.7Jt</Text>
                            <Text style={styles.statLabel}>Revenue Bulan Ini</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>128</Text>
                            <Text style={styles.statLabel}>Total Produk</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>56</Text>
                            <Text style={styles.statLabel}>Karyawan Aktif</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>23</Text>
                            <Text style={styles.statLabel}>Deals Aktif</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Qalcuity v1.0.0</Text>
                    <Text style={styles.footerText}>© 2026 Qalcuity. All rights reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: '#2563EB',
        paddingVertical: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    logo: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    tagline: {
        fontSize: 14,
        color: '#BFDBFE',
        marginTop: 4,
    },
    welcomeCard: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    menuGrid: {
        paddingHorizontal: 16,
    },
    menuCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    menuIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    menuSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    menuArrow: {
        fontSize: 24,
        color: '#9CA3AF',
    },
    statsContainer: {
        paddingHorizontal: 16,
        marginTop: 8,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
});
