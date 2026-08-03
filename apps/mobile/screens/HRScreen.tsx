import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';

type Tab = 'employees' | 'attendance' | 'leaves' | 'payroll';

const employees = [
    { id: 'EMP-001', name: 'Ahmad Rizky', position: 'Software Engineer', department: 'Engineering', status: 'active' },
    { id: 'EMP-002', name: 'Siti Rahayu', position: 'Marketing Manager', department: 'Marketing', status: 'active' },
    { id: 'EMP-003', name: 'Budi Santoso', position: 'Finance Director', department: 'Finance', status: 'active' },
    { id: 'EMP-004', name: 'Dewi Lestari', position: 'HR Specialist', department: 'HR', status: 'active' },
    { id: 'EMP-005', name: 'Eko Prasetyo', position: 'Sales Executive', department: 'Sales', status: 'on_leave' },
];

const attendance = [
    { id: '1', name: 'Ahmad Rizky', time: '08:55', status: 'present', date: '03 Aug 2026' },
    { id: '2', name: 'Siti Rahayu', time: '09:15', status: 'late', date: '03 Aug 2026' },
    { id: '3', name: 'Budi Santoso', time: '08:30', status: 'present', date: '03 Aug 2026' },
    { id: '4', name: 'Dewi Lestari', time: '-', status: 'absent', date: '03 Aug 2026' },
    { id: '5', name: 'Eko Prasetyo', time: '-', status: 'leave', date: '03 Aug 2026' },
];

const leaves = [
    { id: '1', name: 'Eko Prasetyo', type: 'Annual Leave', period: '03-05 Aug 2026', status: 'approved', days: 3 },
    { id: '2', name: 'Siti Rahayu', type: 'Sick Leave', period: '04 Aug 2026', status: 'pending', days: 1 },
    { id: '3', name: 'Ahmad Rizky', type: 'Personal Leave', period: '10 Aug 2026', status: 'pending', days: 1 },
];

const payroll = [
    { id: 'EMP-001', name: 'Ahmad Rizky', salary: 'Rp 15.000.000', status: 'processed', period: 'Jul 2026' },
    { id: 'EMP-002', name: 'Siti Rahayu', salary: 'Rp 18.000.000', status: 'processed', period: 'Jul 2026' },
    { id: 'EMP-003', name: 'Budi Santoso', salary: 'Rp 25.000.000', status: 'processed', period: 'Jul 2026' },
    { id: 'EMP-004', name: 'Dewi Lestari', salary: 'Rp 12.000.000', status: 'pending', period: 'Jul 2026' },
    { id: 'EMP-005', name: 'Eko Prasetyo', salary: 'Rp 14.000.000', status: 'pending', period: 'Jul 2026' },
];

export default function HRScreen() {
    const [activeTab, setActiveTab] = useState<Tab>('employees');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#059669';
            case 'on_leave': return '#D97706';
            case 'present': return '#059669';
            case 'late': return '#D97706';
            case 'absent': return '#DC2626';
            case 'leave': return '#7C3AED';
            case 'approved': return '#059669';
            case 'pending': return '#D97706';
            case 'processed': return '#059669';
            default: return '#6B7280';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'ACTIVE';
            case 'on_leave': return 'ON LEAVE';
            case 'present': return 'PRESENT';
            case 'late': return 'LATE';
            case 'absent': return 'ABSENT';
            case 'leave': return 'ON LEAVE';
            case 'approved': return 'APPROVED';
            case 'pending': return 'PENDING';
            case 'processed': return 'PROCESSED';
            default: return status.toUpperCase();
        }
    };

    const renderEmployees = () => (
        <View style={styles.section}>
            {employees.map((employee) => (
                <View key={employee.id} style={styles.listItem}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{employee.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.listItemContent}>
                        <View style={styles.listItemHeader}>
                            <Text style={styles.listItemTitle}>{employee.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(employee.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(employee.status) }]}>
                                    {getStatusLabel(employee.status)}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listItemSubtitle}>{employee.position}</Text>
                        <Text style={styles.listItemMeta}>{employee.department} • {employee.id}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderAttendance = () => (
        <View style={styles.section}>
            {attendance.map((item) => (
                <View key={item.id} style={styles.listItem}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.listItemContent}>
                        <View style={styles.listItemHeader}>
                            <Text style={styles.listItemTitle}>{item.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listItemSubtitle}>Time: {item.time}</Text>
                        <Text style={styles.listItemMeta}>{item.date}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderLeaves = () => (
        <View style={styles.section}>
            {leaves.map((leave) => (
                <View key={leave.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                        <View style={styles.listItemHeader}>
                            <Text style={styles.listItemTitle}>{leave.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(leave.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(leave.status) }]}>
                                    {getStatusLabel(leave.status)}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listItemSubtitle}>{leave.type}</Text>
                        <View style={styles.listItemFooter}>
                            <Text style={styles.listItemMeta}>{leave.period}</Text>
                            <Text style={styles.leaveDays}>{leave.days} day{leave.days > 1 ? 's' : ''}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderPayroll = () => (
        <View style={styles.section}>
            {payroll.map((item) => (
                <View key={item.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                        <View style={styles.listItemHeader}>
                            <Text style={styles.listItemTitle}>{item.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.listItemSubtitle}>{item.period}</Text>
                        <Text style={styles.listItemAmount}>{item.salary}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Tab Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarContainer}>
                <View style={styles.tabBar}>
                    {(['employees', 'attendance', 'leaves', 'payroll'] as Tab[]).map((tab) => (
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
            </ScrollView>

            <ScrollView style={styles.scrollView}>
                {activeTab === 'employees' && renderEmployees()}
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'leaves' && renderLeaves()}
                {activeTab === 'payroll' && renderPayroll()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    tabBarContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tabBar: {
        flexDirection: 'row',
        minWidth: '100%',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        minWidth: 80,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#2563EB',
    },
    tabText: {
        fontSize: 13,
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
        alignItems: 'flex-start',
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
        color: '#6B7280',
        marginTop: 2,
    },
    listItemMeta: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
    },
    listItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    listItemAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563EB',
        marginTop: 4,
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
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    leaveDays: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563EB',
    },
});
