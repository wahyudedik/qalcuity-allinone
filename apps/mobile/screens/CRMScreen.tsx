import React, { useState, useEffect, useCallback } from 'react';
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
import { fetchLeads, fetchDeals, fetchContacts, formatCurrency, LeadData, DealData, ContactData } from '../lib/api';
import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import EmptyView from '../components/EmptyView';

type Tab = 'leads' | 'deals' | 'contacts';
type CRMScreenProp = NativeStackNavigationProp<RootStackParamList, 'CRM'>;

interface Props {
    navigation: CRMScreenProp;
}

export default function CRMScreen({ navigation }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('leads');
    const [leads, setLeads] = useState<LeadData[]>([]);
    const [deals, setDeals] = useState<DealData[]>([]);
    const [contacts, setContacts] = useState<ContactData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            setError(null);
            const [leadsData, dealsData, contactsData] = await Promise.all([
                fetchLeads().catch(() => []),
                fetchDeals().catch(() => []),
                fetchContacts().catch(() => []),
            ]);
            setLeads(leadsData);
            setDeals(dealsData);
            setContacts(contactsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat data');
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
            case 'new': return '#2563EB';
            case 'qualified': case 'Discovery': return '#059669';
            case 'proposal': case 'Proposal': return '#D97706';
            case 'negotiation': case 'Negosiasi': case 'Negotiation': return '#7C3AED';
            case 'won': case 'Closing': return '#059669';
            case 'lost': return '#DC2626';
            default: return '#6B7280';
        }
    };

    if (loading) return <LoadingView message="Memuat data CRM..." />;
    if (error) return <ErrorView message={error} onRetry={loadData} />;

    const renderLeads = () => (
        <View style={styles.section}>
            {leads.length === 0 ? (
                <EmptyView icon="🎯" title="Belum ada leads" message="Leads akan muncul di sini" />
            ) : (
                leads.map((lead) => (
                    <TouchableOpacity
                        key={lead.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('LeadDetail', { id: lead.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{lead.name}</Text>
                            <Text style={styles.listItemSubtitle}>{lead.source} • {formatCurrency(lead.value)}</Text>
                        </View>
                        <View style={styles.listItemRight}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
                                    {lead.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const renderDeals = () => (
        <View style={styles.section}>
            {deals.length === 0 ? (
                <EmptyView icon="🤝" title="Belum ada deals" message="Deals akan muncul di sini" />
            ) : (
                deals.map((deal) => (
                    <TouchableOpacity
                        key={deal.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('DealDetail', { id: deal.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{deal.name}</Text>
                            <Text style={styles.listItemSubtitle}>{deal.stage} • Win Rate: {deal.probability}%</Text>
                        </View>
                        <View style={styles.listItemRight}>
                            <Text style={styles.listItemAmount}>{formatCurrency(deal.value)}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const renderContacts = () => (
        <View style={styles.section}>
            {contacts.length === 0 ? (
                <EmptyView icon="👤" title="Belum ada kontak" message="Kontak akan muncul di sini" />
            ) : (
                contacts.map((contact) => (
                    <TouchableOpacity
                        key={contact.id}
                        style={styles.listItem}
                        onPress={() => navigation.navigate('ContactDetail', { id: contact.id })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemTitle}>{contact.name}</Text>
                            <Text style={styles.listItemSubtitle}>{contact.position || contact.type} • {contact.company}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {(['leads', 'deals', 'contacts'] as Tab[]).map((tab) => (
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

            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
            >
                {activeTab === 'leads' && renderLeads()}
                {activeTab === 'deals' && renderDeals()}
                {activeTab === 'contacts' && renderContacts()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#2563EB',
    },
    tabText: {
        fontSize: 14,
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
        alignItems: 'center',
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
    listItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    listItemSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    listItemRight: {
        alignItems: 'flex-end',
    },
    listItemAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
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
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563EB',
    },
});
