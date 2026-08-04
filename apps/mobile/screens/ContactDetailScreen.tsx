import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { fetchContactDetail, formatDate, ContactDetailData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    route: RouteProp<RootStackParamList, 'ContactDetail'>;
};

export default function ContactDetailScreen({ route }: Props) {
    const { id } = route.params;
    const [contact, setContact] = useState<ContactDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const data = await fetchContactDetail(id);
            setContact(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat kontak');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading) return <LoadingView message="Memuat detail kontak..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!contact) return <ErrorView message="Kontak tidak ditemukan" />;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* Avatar Header */}
                <View style={styles.headerCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.name}>{contact.name}</Text>
                    <Text style={styles.position}>{contact.position || contact.type} • {contact.company}</Text>
                </View>

                {/* Contact Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Kontak</Text>
                    <InfoRow label="Email" value={contact.email} />
                    <InfoRow label="Telepon" value={contact.phone} />
                    <InfoRow label="Alamat" value={contact.address || '-'} />
                    <InfoRow label="Tipe" value={contact.type} />
                    <InfoRow label="Dibuat" value={formatDate(contact.createdAt)} />
                </View>

                {/* Notes */}
                {contact.notes ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Catatan</Text>
                        <Text style={styles.notesText}>{contact.notes}</Text>
                    </View>
                ) : null}

                {/* Deals */}
                {contact.deals && contact.deals.length > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Deals Terkait</Text>
                        {contact.deals.map((deal, idx) => (
                            <View key={idx} style={styles.dealItem}>
                                <Text style={styles.dealName}>{deal.name}</Text>
                                <Text style={styles.dealStage}>{deal.stage}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {/* Activities */}
                {contact.activities && contact.activities.length > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Aktivitas Terbaru</Text>
                        {contact.activities.map((activity, idx) => (
                            <View key={idx} style={styles.activityItem}>
                                <Text style={styles.activityType}>{activity.type}</Text>
                                <Text style={styles.activityDesc}>{activity.description}</Text>
                                <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
                            </View>
                        ))}
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
    dealItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    dealName: { fontSize: 13, fontWeight: '600', color: '#111827' },
    dealStage: { fontSize: 12, color: '#6B7280' },
    activityItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    activityType: { fontSize: 12, fontWeight: '600', color: '#2563EB', textTransform: 'uppercase' },
    activityDesc: { fontSize: 13, color: '#111827', marginTop: 2 },
    activityDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});
