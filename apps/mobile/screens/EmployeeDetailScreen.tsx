import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { fetchEmployeeDetail, formatDate, formatCurrency, EmployeeData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    route: RouteProp<RootStackParamList, 'EmployeeDetail'>;
};

export default function EmployeeDetailScreen({ route }: Props) {
    const { id } = route.params;
    const [employee, setEmployee] = useState<EmployeeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const data = await fetchEmployeeDetail(id);
            setEmployee(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data karyawan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#059669';
            case 'on_leave': return '#D97706';
            case 'inactive': return '#DC2626';
            default: return '#6B7280';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'ACTIVE';
            case 'on_leave': return 'ON LEAVE';
            case 'inactive': return 'INACTIVE';
            default: return status.toUpperCase();
        }
    };

    if (loading) return <LoadingView message="Memuat data karyawan..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!employee) return <ErrorView message="Karyawan tidak ditemukan" />;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Header */}
                <View style={styles.headerCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{employee.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.name}>{employee.name}</Text>
                    <Text style={styles.position}>{employee.position}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(employee.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(employee.status) }]}>
                            {getStatusLabel(employee.status)}
                        </Text>
                    </View>
                </View>

                {/* Personal Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Pribadi</Text>
                    <InfoRow label="ID Karyawan" value={employee.id} />
                    <InfoRow label="Email" value={employee.email} />
                    <InfoRow label="Telepon" value={employee.phone} />
                    <InfoRow label="Departemen" value={employee.department} />
                    <InfoRow label="Tanggal Bergabung" value={formatDate(employee.joinDate)} />
                </View>

                {/* Compensation */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Kompensasi</Text>
                    <InfoRow label="Gaji Pokok" value={formatCurrency(employee.salary)} />
                    <InfoRow label="THR" value="Sesuai peraturan" />
                    <InfoRow label="BPJS" value="Full coverage" />
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
    headerCard: { backgroundColor: '#DC2626', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 28, fontWeight: 'bold', color: '#DC2626' },
    name: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12 },
    position: { fontSize: 14, color: '#FCA5A5', marginTop: 4 },
    statusBadge: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
    statusText: { fontSize: 12, fontWeight: '600' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: '#6B7280' },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
});
