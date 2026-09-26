import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, ScreenMode } from '../App';
import {
    getContact,
    createContact,
    updateContact,
    deleteContact,
    formatDate,
    MobileContact,
    CreateContactPayload,
    UpdateContactPayload,
} from '../lib/api';
import { ContactForm } from '../components/forms';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ContactDetail'>;
    route: RouteProp<RootStackParamList, 'ContactDetail'>;
};

export default function ContactDetailScreen({ navigation, route }: Props) {
    const { id, mode: initialMode } = route.params || {};
    const [mode, setMode] = useState<ScreenMode>(initialMode || (id ? 'view' : 'create'));
    const [contact, setContact] = useState<MobileContact | null>(null);
    const [loading, setLoading] = useState(mode === 'view' && !!id);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        if (!id) return;
        try {
            setError(null);
            setLoading(true);
            const data = await getContact(id);
            setContact(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat kontak');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'view' && id) {
            loadData();
        }
    }, [id, mode]);

    const handleSave = async (data: CreateContactPayload | UpdateContactPayload) => {
        setSaving(true);
        try {
            if (mode === 'create') {
                await createContact(data as CreateContactPayload);
                Alert.alert('Berhasil', 'Kontak berhasil dibuat');
            } else if (mode === 'edit' && id) {
                await updateContact(id, data as UpdateContactPayload);
                Alert.alert('Berhasil', 'Kontak berhasil diperbarui');
            }
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menyimpan kontak');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Hapus Kontak',
            'Apakah Anda yakin ingin menghapus kontak ini? Tindakan ini tidak dapat dibatalkan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        if (!id) return;
                        try {
                            setSaving(true);
                            await deleteContact(id);
                            Alert.alert('Berhasil', 'Kontak berhasil dihapus');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Gagal menghapus kontak');
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

    // ─── Edit / Create Mode ──────────────────────────────────────────────────
    if (mode === 'edit' || mode === 'create') {
        return (
            <SafeAreaView style={styles.container}>
                <ContactForm
                    initialData={mode === 'edit' ? contact || undefined : undefined}
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
    if (loading) return <LoadingView message="Memuat detail kontak..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!contact) return <ErrorView message="Kontak tidak ditemukan" />;

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
                {/* Avatar Header */}
                <View style={styles.headerCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.name}>{contact.name}</Text>
                    <Text style={styles.position}>{contact.type} {contact.company ? `• ${contact.company}` : ''}</Text>
                </View>

                {/* Contact Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Kontak</Text>
                    <InfoRow label="Email" value={contact.email || '-'} />
                    <InfoRow label="Telepon" value={contact.phone || '-'} />
                    <InfoRow label="Alamat" value={contact.address || '-'} />
                    <InfoRow label="Tipe" value={contact.type} />
                    <InfoRow label="Status" value={contact.isActive ? 'Aktif' : 'Nonaktif'} />
                    <InfoRow label="Dibuat" value={formatDate(contact.createdAt)} />
                </View>

                {/* Notes */}
                {contact.notes ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Catatan</Text>
                        <Text style={styles.notesText}>{contact.notes}</Text>
                    </View>
                ) : null}
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
    headerCard: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 28, fontWeight: 'bold', color: '#2563EB' },
    name: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12 },
    position: { fontSize: 14, color: '#BFDBFE', marginTop: 4 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: '#6B7280' },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
    notesText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
