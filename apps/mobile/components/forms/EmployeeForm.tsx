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
import type { MobileEmployee, CreateEmployeePayload, UpdateEmployeePayload } from '../../lib/api';

export interface EmployeeFormProps {
    initialData?: MobileEmployee;
    onSubmit: (data: CreateEmployeePayload | UpdateEmployeePayload) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

const DEPARTMENT_OPTIONS = [
    { label: 'Engineering', value: 'Engineering' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Sales', value: 'Sales' },
    { label: 'HR', value: 'HR' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Customer Support', value: 'Customer Support' },
    { label: 'IT', value: 'IT' },
    { label: 'Lainnya', value: 'Lainnya' },
];

function validateEmail(email: string): boolean {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function EmployeeForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: EmployeeFormProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [position, setPosition] = useState(initialData?.position || '');
    const [department, setDepartment] = useState(initialData?.department || '');
    const [joinDate, setJoinDate] = useState(initialData?.joinDate || '');
    const [salary, setSalary] = useState(
        initialData?.salary ? String(initialData.salary) : ''
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Nama wajib diisi';
        }

        if (!email.trim()) {
            newErrors.email = 'Email wajib diisi';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Format email tidak valid';
        }

        if (joinDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(joinDate)) {
                newErrors.joinDate = 'Format: YYYY-MM-DD';
            }
        }

        if (salary) {
            const salaryNum = parseFloat(salary);
            if (isNaN(salaryNum) || salaryNum < 0) {
                newErrors.salary = 'Gaji tidak boleh negatif';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            const payload: CreateEmployeePayload | UpdateEmployeePayload = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                position: position.trim(),
                department: department.trim(),
                joinDate: joinDate.trim(),
                salary: salary ? parseFloat(salary) : 0,
            };
            await onSubmit(payload);
        } catch (err) {
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Gagal menyimpan karyawan'
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
                <Text style={styles.sectionTitle}>Informasi Pribadi</Text>

                <FormInput
                    label="Nama Lengkap"
                    value={name}
                    onChangeText={setName}
                    placeholder="Nama karyawan"
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
                    required
                />

                <FormInput
                    label="Telepon"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+62 812 3456 7890"
                    keyboardType="phone-pad"
                />

                <Text style={styles.sectionTitle}>Informasi Kerja</Text>

                <FormInput
                    label="Posisi"
                    value={position}
                    onChangeText={setPosition}
                    placeholder="Software Engineer"
                    error={errors.position}
                    required
                />

                <FormSelect
                    label="Departemen"
                    value={department}
                    onValueChange={setDepartment}
                    options={DEPARTMENT_OPTIONS}
                    required
                />

                <FormInput
                    label="Tanggal Masuk"
                    value={joinDate}
                    onChangeText={setJoinDate}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numbers-and-punctuation"
                    error={errors.joinDate}
                />

                <FormInput
                    label="Gaji"
                    value={salary}
                    onChangeText={setSalary}
                    placeholder="0"
                    keyboardType="numeric"
                    error={errors.salary}
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
