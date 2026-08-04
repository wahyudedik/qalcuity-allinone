import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { fetchLeads, formatCurrency, formatDate, LeadData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';

type Props = {
    route: RouteProp<RootStackParamList, 'LeadDetail'>;
};

export default function LeadDetailScreen({ route }: Props) {
    const { id } = route.params;
    const [lead, setLead] = useState<LeadData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const leads = await fetchLeads();
            const found = leads.find(l => l.id === id);
            setLead(found || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat lead');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return '#2563EB';
            case 'qualified': return '#059669';
            case 'contacted': return '#D97706';
            default: return '#6B7280';
        }
    };

    if (loading) return <LoadingView message="Memuat detail lead..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;
    if (!lead) return <ErrorView message="Lead tidak ditemukan" />;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{lead.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
                                {lead.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.value}>{formatCurrency(lead.value)}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Informasi Lead</Text>
                    <InfoRow label="Perusahaan" value={lead.company} />
                    <InfoRow label="Email" value={lead.email} />
                    <InfoRow label="Sumber" value={lead.source} />
                    <InfoRow label="Dibuat" value={formatDate(lead.createdAt)} />
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
    headerCard: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, marginBottom: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
    value: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 12, fontWeight: '600' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: '#6B7280' },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
});
