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
import {
    fetchEmployees, fetchAttendance, fetchLeaves, fetchPayroll,
    formatCurrency, formatDate,
    EmployeeData, AttendanceData, LeaveData, PayrollData,
} from '../lib/api';
import LoadingView from '../components/LoadingView';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorView from '../components/ErrorView';
import EmptyView from '../components/EmptyView';
import SearchBar from '../components/SearchBar';

type Tab = 'employees' | 'attendance' | 'leaves' | 'payroll';
type HRScreenProp = NativeStackNavigationProp<RootStackParamList, 'HR'>;

interface Props {
    navigation: HRScreenProp;
}

export default function HRScreen({ navigation }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('employees');
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [attendance, setAttendance] = useState<AttendanceData[]>([]);
    const [leaves, setLeaves] = useState<LeaveData[]>([]);
    const [payroll, setPayroll] = useState<PayrollData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const loadData = async () => {
        try {
            setError(null);
            const [empData, attData, leaveData, payData] = await Promise.all([
                fetchEmployees().catch(() => []),
                fetchAttendance().catch(() => []),
                fetchLeaves().catch(() => []),
                fetchPayroll().catch(() => []),
            ]);
            setEmployees(empData);
            setAttendance(attData);
            setLeaves(leaveData);
            setPayroll(payData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data HR');
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
            case 'active': case 'present': case 'approved': case 'processed': return '#059669';
            case 'on_leave': case 'late': case 'pending': case 'leave': return '#D97706';
            case 'absent': case 'inactive': return '#DC2626';
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

    // Filtered employees
    const filteredEmployees = useMemo(() => {
        let result = employees;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (e) =>
                    e.name?.toLowerCase().includes(q) ||
                    e.position?.toLowerCase().includes(q) ||
                    e.department?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'all') {
            result = result.filter((e) => e.status === statusFilter);
        }
        return result;
    }, [employees, searchQuery, statusFilter]);

    // Filtered attendance
    const filteredAttendance = useMemo(() => {
        if (!searchQuery) return attendance;
        const q = searchQuery.toLowerCase();
        return attendance.filter(
            (a) => a.employeeName?.toLowerCase().includes(q)
        );
    }, [attendance, searchQuery]);

    // Filtered leaves
    const filteredLeaves = useMemo(() => {
        let result = leaves;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (l) => l.employeeName?.toLowerCase().includes(q) || l.type?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'all') {
            result = result.filter((l) => l.status === statusFilter);
        }
        return result;
    }, [leaves, searchQuery, statusFilter]);

    // Filtered payroll
    const filteredPayroll = useMemo(() => {
        if (!searchQuery) return payroll;
        const q = searchQuery.toLowerCase();
        return payroll.filter(
            (p) => p.employeeName?.toLowerCase().includes(q)
        );
    }, [payroll, searchQuery]);

    const employeeStatusFilters = [
        { label: 'Semua', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'On Leave', value: 'on_leave' },
        { label: 'Inactive', value: 'inactive' },
    ];

    const leaveStatusFilters = [
        { label: 'Semua', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
    ];

    if (loading) return <LoadingSkeleton variant="list" rows={5} />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;

    const renderEmployees = () => (
        <View style={styles.section}>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari karyawan..."
                filterOptions={employeeStatusFilters}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />
            {filteredEmployees.length === 0 ? (
                <EmptyView title="Tidak ada karyawan" message={searchQuery ? 'Tidak ditemukan karyawan yang sesuai' : 'Data karyawan akan muncul di sini'} />
            ) : (
                filteredEmployees.map((employee) => (
                    <TouchableOpacity
                        key={employee.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('EmployeeDetail', { id: employee.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{employee.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.listItemContent}>
                            <View style={styles.listItemHeader}>
                                <Text style={styles.listItemTitle} numberOfLines={1}>{employee.name}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(employee.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(employee.status) }]}>
                                        {getStatusLabel(employee.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>{employee.position}</Text>
                            <Text style={styles.listItemMeta} numberOfLines={1}>{employee.department} · {employee.id}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const renderAttendance = () => (
        <View style={styles.section}>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari absensi..."
            />
            {filteredAttendance.length === 0 ? (
                <EmptyView title="Tidak ada data absensi" message={searchQuery ? 'Tidak ditemukan data yang sesuai' : 'Data absensi akan muncul di sini'} />
            ) : (
                filteredAttendance.map((item) => (
                    <View key={item.id} style={styles.listItem}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.employeeName.charAt(0)}</Text>
                        </View>
                        <View style={styles.listItemContent}>
                            <View style={styles.listItemHeader}>
                                <Text style={styles.listItemTitle} numberOfLines={1}>{item.employeeName}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                        {getStatusLabel(item.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>Clock In: {item.clockIn} {item.clockOut ? `· Clock Out: ${item.clockOut}` : ''}</Text>
                            <Text style={styles.listItemMeta} numberOfLines={1}>{formatDate(item.date)} · {item.workHours} jam</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderLeaves = () => (
        <View style={styles.section}>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari pengajuan cuti..."
                filterOptions={leaveStatusFilters}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />
            {filteredLeaves.length === 0 ? (
                <EmptyView title="Tidak ada pengajuan cuti" message={searchQuery ? 'Tidak ditemukan data yang sesuai' : 'Pengajuan cuti akan muncul di sini'} />
            ) : (
                filteredLeaves.map((leave) => (
                    <View key={leave.id} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                            <View style={styles.listItemHeader}>
                                <Text style={styles.listItemTitle} numberOfLines={1}>{leave.employeeName}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(leave.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(leave.status) }]}>
                                        {getStatusLabel(leave.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>{leave.type}</Text>
                            <View style={styles.listItemFooter}>
                                <Text style={styles.listItemMeta} numberOfLines={1}>{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</Text>
                                <Text style={styles.leaveDays}>{leave.days} hari</Text>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderPayroll = () => (
        <View style={styles.section}>
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari data payroll..."
            />
            {filteredPayroll.length === 0 ? (
                <EmptyView title="Tidak ada data payroll" message={searchQuery ? 'Tidak ditemukan data yang sesuai' : 'Data payroll akan muncul di sini'} />
            ) : (
                filteredPayroll.map((item) => (
                    <View key={item.id} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                            <View style={styles.listItemHeader}>
                                <Text style={styles.listItemTitle} numberOfLines={1}>{item.employeeName}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                        {getStatusLabel(item.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.listItemSubtitle} numberOfLines={1}>{item.period}</Text>
                            <Text style={styles.listItemAmount}>{formatCurrency(item.netSalary)}</Text>
                        </View>
                    </View>
                ))
            )}
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
                            onPress={() => { setActiveTab(tab); setSearchQuery(''); setStatusFilter('all'); }}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab === 'employees' ? 'Karyawan' : tab === 'attendance' ? 'Absensi' : tab === 'leaves' ? 'Cuti' : 'Payroll'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} tintColor="#2563EB" />}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'employees' && renderEmployees()}
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'leaves' && renderLeaves()}
                {activeTab === 'payroll' && renderPayroll()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    tabBarContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tabBar: { flexDirection: 'row', paddingHorizontal: 8 },
    tab: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#2563EB' },
    tabText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    activeTabText: { color: '#2563EB', fontWeight: '600' },
    scrollView: { flex: 1 },
    section: { paddingHorizontal: 16, paddingTop: 16 },
    listItem: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    listItemContent: { flex: 1, marginLeft: 12 },
    listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listItemTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
    listItemSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    listItemMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    listItemFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    listItemAmount: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: '600' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 16, fontWeight: '600', color: '#DC2626' },
    leaveDays: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
});
