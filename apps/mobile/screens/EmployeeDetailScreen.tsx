import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ScreenMode } from '../App';
import {
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    formatDate,
    formatCurrency,
    MobileEmployee,
    CreateEmployeePayload,
    UpdateEmployeePayload,
} from '../lib/api';
import { EmployeeForm } from '../components/forms';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'EmployeeDetail'>;
    route: RouteProp<RootStackParamList, 'EmployeeDetail'>;
};

export default function EmployeeDetailScreen({ navigation, route }: Props) {
    const { id, mode: initialMode } = route.params || {};
    const [mode, setMode] = useState<ScreenMode>(initialMode || (id ? 'view' : 'create'));
    const [employee, setEmployee] = useState<MobileEmployee | null>(null);
    const [loading, setLoading] = useState(mode === 'view' && !!id);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        if (!id) return;
        try {
            setError(null);
            setLoading(true);
            const data = await getEmployee(id);
            setEmployee(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data karyawan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'view' && id) {
            loadData();
        }
    }, [id, mode]);

    const handleSave = async (data: CreateEmployeePayload | UpdateEmployeePayload) => {
        setSaving(true);
        try {
            if (mode === 'create') {
                await createEmployee(data as CreateEmployeePayload);
                Alert.alert('Berhasil', 'Karyawan berhasil dibuat');
            } else if (mode === 'edit' && id) {
                await updateEmployee(id, data as UpdateEmployeePayload);
                Alert.alert('Berhasil', 'Karyawan berhasil diperbarui');
            }
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menyimpan karyawan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Hapus Karyawan',
            'Apakah Anda yakin ingin menghapus data karyawan ini? Tindakan ini tidak dapat dibatalkan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        if (!id) return;
                        try {
                            setSaving(true);
                            await deleteEmployee(id);
                            Alert.alert('Berhasil', 'Karyawan berhasil dihapus');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menghapus karyawan');
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

    // ─── Edit / Create Mode ──────────────────────────────────────────────────
    if (mode === 'edit' || mode === 'create') {
        return (
            <SafeAreaView style={styles.container}>
                <EmployeeForm
                    initialData={mode === 'edit' ? employee || undefined : undefined}
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
    if (loading) return <LoadingView message="Memuat data karyawan..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!employee) return <ErrorView message="Karyawan tidak ditemukan" />;

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
                    <InfoRow label="ID Karyawan" value={employee.employeeId || employee.id} />
                    <InfoRow label="Email" value={employee.email} />
                    <InfoRow label="Telepon" value={employee.phone || '-'} />
                    <InfoRow label="Departemen" value={employee.department} />
                    <InfoRow label="Tanggal Bergabung" value={formatDate(employee.joinDate)} />
                </View>

                {/* Compensation */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Kompensasi</Text>
                    <InfoRow label="Gaji Pokok" value={formatCurrency(employee.salary)} />
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
