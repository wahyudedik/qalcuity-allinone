import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';

type Tab = 'leads' | 'deals' | 'contacts';

const leads = [
    { id: '1', name: 'PT ABC Technology', source: 'Website', status: 'new', value: 'Rp 50.000.000' },
    { id: '2', name: 'CV Maju Bersama', source: 'Referral', status: 'qualified', value: 'Rp 25.000.000' },
    { id: '3', name: 'PT Digital Nusantara', source: 'LinkedIn', status: 'proposal', value: 'Rp 100.000.000' },
    { id: '4', name: 'PT Sejahtera Abadi', source: 'Cold Call', status: 'negotiation', value: 'Rp 75.000.000' },
    { id: '5', name: 'CV Berkah Jaya', source: 'Event', status: 'new', value: 'Rp 15.000.000' },
];

const deals = [
    { id: '1', name: 'Enterprise License PT ABC', value: 'Rp 50.000.000', stage: 'Negotiation', probability: '65%' },
    { id: '2', name: 'Implementation CV Maju', value: 'Rp 25.000.000', stage: 'Proposal', probability: '40%' },
    { id: '3', name: 'Custom Dev PT Digital', value: 'Rp 100.000.000', stage: 'Discovery', probability: '30%' },
    { id: '4', name: 'Support Contract PT Sejahtera', value: 'Rp 75.000.000', stage: 'Negotiation', probability: '70%' },
];

const contacts = [
    { id: '1', name: 'Budi Santoso', company: 'PT ABC Technology', role: 'CTO', email: 'budi@abc.com' },
    { id: '2', name: 'Siti Rahayu', company: 'CV Maju Bersama', role: 'Director', email: 'siti@maju.com' },
    { id: '3', name: 'Ahmad Hidayat', company: 'PT Digital Nusantara', role: 'VP Engineering', email: 'ahmad@digital.com' },
    { id: '4', name: 'Dewi Lestari', company: 'PT Sejahtera Abadi', role: 'Procurement', email: 'dewi@sejahtera.com' },
];

export default function CRMScreen() {
    const [activeTab, setActiveTab] = useState<Tab>('leads');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return '#2563EB';
            case 'qualified': return '#059669';
            case 'proposal': return '#D97706';
            case 'negotiation': return '#7C3AED';
            case 'won': return '#059669';
            case 'lost': return '#DC2626';
            default: return '#6B7280';
        }
    };

    const renderLeads = () => (
        <View style={styles.section}>
            {leads.map((lead) => (
                <View key={lead.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{lead.name}</Text>
                        <Text style={styles.listItemSubtitle}>{lead.source} • {lead.value}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
                                {lead.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderDeals = () => (
        <View style={styles.section}>
            {deals.map((deal) => (
                <View key={deal.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{deal.name}</Text>
                        <Text style={styles.listItemSubtitle}>{deal.stage} • Win Rate: {deal.probability}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                        <Text style={styles.listItemAmount}>{deal.value}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderContacts = () => (
        <View style={styles.section}>
            {contacts.map((contact) => (
                <View key={contact.id} style={styles.listItem}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle}>{contact.name}</Text>
                        <Text style={styles.listItemSubtitle}>{contact.role} • {contact.company}</Text>
                    </View>
                </View>
            ))}
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

            <ScrollView style={styles.scrollView}>
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
        backgroundColor: '#2563EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
