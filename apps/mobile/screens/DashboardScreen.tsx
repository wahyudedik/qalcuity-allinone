import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type DashboardScreenProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
    navigation: DashboardScreenProp;
}

const statCards = [
    { id: 'revenue', title: 'Revenue', value: 'Rp 45.7 Jt', change: '+12.5%', positive: true },
    { id: 'orders', title: 'Orders', value: '156', change: '+8.2%', positive: true },
    { id: 'customers', title: 'Customers', value: '89', change: '+5.1%', positive: true },
    { id: 'products', title: 'Products', value: '128', change: '+3', positive: true },
];

const recentActivities = [
    { id: '1', icon: '💰', title: 'Invoice #INV-001 paid', time: '2 jam lalu', amount: 'Rp 5.000.000' },
    { id: '2', icon: '📦', title: 'New stock arrived', time: '3 jam lalu', amount: '50 unit' },
    { id: '3', icon: '👥', title: 'New employee onboarded', time: '5 jam lalu', amount: 'Ahmad Rizky' },
    { id: '4', icon: '📈', title: 'Deal closed', time: '1 hari lalu', amount: 'Rp 25.000.000' },
    { id: '5', icon: '💳', title: 'Payment received', time: '1 hari lalu', amount: 'Rp 12.500.000' },
];

const quickActions = [
    { id: 'invoice', icon: '📄', title: 'Buat Invoice', screen: 'Finance' as const },
    { id: 'lead', icon: '🎯', title: 'Kelola Lead', screen: 'CRM' as const },
    { id: 'product', icon: '📦', title: 'Kelola Produk', screen: 'Inventory' as const },
    { id: 'employee', icon: '👤', title: 'Kelola Karyawan', screen: 'HR' as const },
];

export default function DashboardScreen({ navigation }: Props) {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {statCards.map((stat) => (
                        <View key={stat.id} style={styles.statCard}>
                            <Text style={styles.statTitle}>{stat.title}</Text>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={[styles.statChange, stat.positive ? styles.positive : styles.negative]}>
                                {stat.change}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Chart Placeholder */}
                <View style={styles.chartCard}>
                    <Text style={styles.sectionTitle}>Revenue Trend</Text>
                    <View style={styles.chartPlaceholder}>
                        <View style={styles.chartBars}>
                            {[40, 65, 45, 80, 60, 95].map((height, i) => (
                                <View
                                    key={i}
                                    style={[styles.chartBar, { height: `${height}%` }]}
                                />
                            ))}
                        </View>
                        <View style={styles.chartLabels}>
                            {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'].map((label, i) => (
                                <Text key={i} style={styles.chartLabel}>{label}</Text>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionCard}
                                onPress={() => navigation.navigate(action.screen)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.actionIcon}>{action.icon}</Text>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Activities */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activities</Text>
                    <View style={styles.activitiesCard}>
                        {recentActivities.map((activity, index) => (
                            <View
                                key={activity.id}
                                style={[styles.activityItem, index < recentActivities.length - 1 && styles.activityBorder]}
                            >
                                <Text style={styles.activityIcon}>{activity.icon}</Text>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityTitle}>{activity.title}</Text>
                                    <Text style={styles.activityTime}>{activity.time}</Text>
                                </View>
                                <Text style={styles.activityAmount}>{activity.amount}</Text>
                            </View>
                        ))}
                    </View>
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
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
    statTitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    statChange: {
        fontSize: 12,
        marginTop: 4,
    },
    positive: {
        color: '#059669',
    },
    negative: {
        color: '#DC2626',
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    chartPlaceholder: {
        height: 150,
        marginTop: 12,
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 120,
    },
    chartBar: {
        width: 30,
        backgroundColor: '#2563EB',
        borderRadius: 4,
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
    },
    chartLabel: {
        fontSize: 10,
        color: '#9CA3AF',
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
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    actionIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    actionTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
        textAlign: 'center',
    },
    activitiesCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    activityBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    activityIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    activityTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    activityAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563EB',
    },
});
