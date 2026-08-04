import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { fetchDeals, fetchDealDetail, formatCurrency, formatDate, DealDetailData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    route: RouteProp<RootStackParamList, 'DealDetail'>;
};

export default function DealDetailScreen({ route }: Props) {
    const { id } = route.params;
    const [deal, setDeal] = useState<DealDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const data = await fetchDealDetail(id);
            setDeal(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat deal');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const getStatusColor = (stage: string) => {
        switch (stage) {
            case 'Discovery': return '#059669';
            case 'Proposal': return '#D97706';
            case 'Negosiasi': case 'Negotiation': return '#7C3AED';
            case 'Closing': return '#2563EB';
            default: return '#6B7280';
        }
    };

    if (loading) return <LoadingView message="Memuat detail deal..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!deal) return <ErrorView message="Deal tidak ditemukan" />;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.headerCard}>
                    <Text style={styles.title}>{deal.name}</Text>
                    <Text style={styles.value}>{formatCurrency(deal.value)}</Text>
                    <View style={[styles.stageBadge, { backgroundColor: getStatusColor(deal.stage) }]}>
                        <Text style={styles.stageText}>{deal.stage}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Deal</Text>
                    <InfoRow label="Perusahaan" value={deal.company} />
                    <InfoRow label="Kontak" value={deal.contactName} />
                    <InfoRow label="Probabilitas" value={`${deal.probability}%`} />
                    <InfoRow label="Target Closing" value={formatDate(deal.expectedCloseDate)} />
                    <InfoRow label="Dibuat" value={formatDate(deal.createdAt)} />
                </View>

                {deal.notes ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Catatan</Text>
                        <Text style={styles.notesText}>{deal.notes}</Text>
                    </View>
                ) : null}

                {deal.activities && deal.activities.length > 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Aktivitas Terbaru</Text>
                        {deal.activities.map((activity, idx) => (
                            <View key={idx} style={styles.activityItem}>
                                <Text style={styles.activityType}>{activity.type}</Text>
                                <Text style={styles.activityDesc}>{activity.description}</Text>
                                <Text style={styles.activityMeta}>{activity.user} • {formatDate(activity.date)}</Text>
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
    headerCard: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 16, marginBottom: 12 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
    value: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 8 },
    stageBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
    stageText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: '#6B7280' },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
    notesText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
    activityItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    activityType: { fontSize: 12, fontWeight: '600', color: '#2563EB', textTransform: 'uppercase' },
    activityDesc: { fontSize: 13, color: '#111827', marginTop: 2 },
    activityMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});
