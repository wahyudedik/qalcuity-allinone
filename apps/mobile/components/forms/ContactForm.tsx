import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormActions } from './FormActions';
import type { MobileContact, CreateContactPayload, UpdateContactPayload } from '../../lib/api';

export interface ContactFormProps {
    initialData?: MobileContact;
    onSubmit: (data: CreateContactPayload | UpdateContactPayload) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

const CONTACT_TYPE_OPTIONS = [
    { label: 'Customer', value: 'customer' },
    { label: 'Supplier', value: 'supplier' },
    { label: 'Lead', value: 'lead' },
];

function validateEmail(email: string): boolean {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
    if (!phone) return true;
    const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
    return phoneRegex.test(phone);
}

export function ContactForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: ContactFormProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [type, setType] = useState(initialData?.type || 'customer');
    const [company, setCompany] = useState(initialData?.company || '');
    const [address, setAddress] = useState(initialData?.address || '');
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Nama wajib diisi';
        }

        if (email && !validateEmail(email)) {
            newErrors.email = 'Format email tidak valid';
        }

        if (phone && !validatePhone(phone)) {
            newErrors.phone = 'Format telepon tidak valid';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            const payload: CreateContactPayload | UpdateContactPayload = {
                name: name.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
                type,
                company: company.trim() || null,
                address: address.trim() || null,
                notes: notes.trim() || null,
            };
            await onSubmit(payload);
        } catch (err) {
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Gagal menyimpan kontak'
            );
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.sectionTitle}>Informasi Dasar</Text>

                <FormInput
                    label="Nama"
                    value={name}
                    onChangeText={setName}
                    placeholder="Nama kontak"
                    error={errors.name}
                    required
                />

                <FormInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@contoh.com"
                    keyboardType="email-address"
                    error={errors.email}
                />

                <FormInput
                    label="Telepon"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+62 812 3456 7890"
                    keyboardType="phone-pad"
                    error={errors.phone}
                />

                <FormSelect
                    label="Tipe"
                    value={type}
                    onValueChange={setType}
                    options={CONTACT_TYPE_OPTIONS}
                    required
                />

                <FormInput
                    label="Perusahaan"
                    value={company}
                    onChangeText={setCompany}
                    placeholder="Nama perusahaan"
                />

                <Text style={styles.sectionTitle}>Alamat & Catatan</Text>

                <FormInput
                    label="Alamat"
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Alamat lengkap"
                    multiline
                />

                <FormInput
                    label="Catatan"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Catatan tambahan"
                    multiline
                />

                <FormActions
                    onSave={handleSubmit}
                    onCancel={onCancel}
                    isLoading={isLoading}
                    saveLabel={initialData ? 'Perbarui' : 'Simpan'}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    contentContainer: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
        marginTop: 8,
    },
});
