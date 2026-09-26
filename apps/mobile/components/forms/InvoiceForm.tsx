import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormActions } from './FormActions';
import type {
    MobileInvoice,
    CreateInvoicePayload,
    UpdateInvoicePayload,
    InvoiceItemPayload,
} from '../../lib/api';

export interface InvoiceFormProps {
    initialData?: MobileInvoice;
    onSubmit: (data: CreateInvoicePayload | UpdateInvoicePayload) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

interface InvoiceItemForm {
    key: string;
    description: string;
    quantity: string;
    unitPrice: string;
}

let itemCounter = 0;

function generateItemKey(): string {
    itemCounter += 1;
    return `item-${Date.now()}-${itemCounter}`;
}

function createEmptyItem(): InvoiceItemForm {
    return {
        key: generateItemKey(),
        description: '',
        quantity: '1',
        unitPrice: '0',
    };
}

function calculateSubtotal(items: InvoiceItemForm[]): number {
    return items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        return sum + qty * price;
    }, 0);
}

export function InvoiceForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: InvoiceFormProps) {
    const [contactId, setContactId] = useState(initialData?.contactId || '');
    const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
    const [taxRate, setTaxRate] = useState(
        initialData?.items ? '' : '11'
    );
    const [notes, setNotes] = useState(initialData?.notes || '');

    const buildInitialItems = (): InvoiceItemForm[] => {
        if (initialData?.items && initialData.items.length > 0) {
            return initialData.items.map((item) => ({
                key: generateItemKey(),
                description: item.description,
                quantity: String(item.quantity),
                unitPrice: String(item.unitPrice),
            }));
        }
        return [createEmptyItem()];
    };

    const [items, setItems] = useState<InvoiceItemForm[]>(buildInitialItems);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateItem = useCallback(
        (key: string, field: keyof InvoiceItemForm, value: string) => {
            setItems((prev) =>
                prev.map((item) =>
                    item.key === key ? { ...item, [field]: value } : item
                )
            );
        },
        []
    );

    const addItem = () => {
        setItems((prev) => [...prev, createEmptyItem()]);
    };

    const removeItem = (key: string) => {
        if (items.length <= 1) {
            Alert.alert('Info', 'Minimal harus ada 1 item');
            return;
        }
        setItems((prev) => prev.filter((item) => item.key !== key));
    };

    const subtotal = calculateSubtotal(items);
    const taxRateNum = parseFloat(taxRate) || 0;
    const taxAmount = subtotal * (taxRateNum / 100);
    const total = subtotal + taxAmount;

    const formatCurrency = (val: number): string => {
        return `Rp ${val.toLocaleString('id-ID')}`;
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (items.length === 0) {
            newErrors.items = 'Minimal harus ada 1 item';
        }

        items.forEach((item, index) => {
            if (!item.description.trim()) {
                newErrors[`item-${index}-description`] = 'Deskripsi wajib diisi';
            }
            const qty = parseFloat(item.quantity);
            if (isNaN(qty) || qty <= 0) {
                newErrors[`item-${index}-quantity`] = 'Qty harus > 0';
            }
            const price = parseFloat(item.unitPrice);
            if (isNaN(price) || price <= 0) {
                newErrors[`item-${index}-price`] = 'Harga harus > 0';
            }
        });

        if (dueDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dueDate)) {
                newErrors.dueDate = 'Format: YYYY-MM-DD';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            const payloadItems: InvoiceItemPayload[] = items.map((item) => ({
                description: item.description.trim(),
                quantity: parseFloat(item.quantity) || 1,
                unitPrice: parseFloat(item.unitPrice) || 0,
            }));

            const payload: CreateInvoicePayload | UpdateInvoicePayload = {
                contactId: contactId || null,
                items: payloadItems,
                dueDate: dueDate || null,
                taxRate: taxRateNum,
                notes: notes.trim() || null,
            };
            await onSubmit(payload);
        } catch (err) {
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Gagal menyimpan invoice'
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
                <Text style={styles.sectionTitle}>Informasi Invoice</Text>

                <FormInput
                    label="ID Pelanggan"
                    value={contactId}
                    onChangeText={setContactId}
                    placeholder="UUID pelanggan (opsional)"
                />

                <FormInput
                    label="Tanggal Jatuh Tempo"
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numbers-and-punctuation"
                    error={errors.dueDate}
                />

                <FormInput
                    label="Pajak (%)"
                    value={taxRate}
                    onChangeText={setTaxRate}
                    placeholder="11"
                    keyboardType="numeric"
                />

                {/* Items Section */}
                <Text style={styles.sectionTitle}>Item Invoice</Text>
                {errors.items ? (
                    <Text style={styles.errorText}>{errors.items}</Text>
                ) : null}

                {items.map((item, index) => (
                    <View key={item.key} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemNumber}>Item {index + 1}</Text>
                            <TouchableOpacity
                                onPress={() => removeItem(item.key)}
                                style={styles.removeButton}
                                accessibilityLabel={`Hapus item ${index + 1}`}
                            >
                                <Text style={styles.removeText}>Hapus</Text>
                            </TouchableOpacity>
                        </View>

                        <FormInput
                            label="Deskripsi"
                            value={item.description}
                            onChangeText={(val) => updateItem(item.key, 'description', val)}
                            placeholder="Deskripsi item"
                            error={errors[`item-${index}-description`]}
                            required
                        />

                        <View style={styles.row}>
                            <View style={styles.halfField}>
                                <FormInput
                                    label="Jumlah"
                                    value={item.quantity}
                                    onChangeText={(val) => updateItem(item.key, 'quantity', val)}
                                    placeholder="1"
                                    keyboardType="numeric"
                                    error={errors[`item-${index}-quantity`]}
                                    required
                                />
                            </View>
                            <View style={styles.halfField}>
                                <FormInput
                                    label="Harga Satuan"
                                    value={item.unitPrice}
                                    onChangeText={(val) => updateItem(item.key, 'unitPrice', val)}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    error={errors[`item-${index}-price`]}
                                    required
                                />
                            </View>
                        </View>

                        <Text style={styles.itemSubtotal}>
                            Subtotal: {formatCurrency(
                                (parseFloat(item.quantity) || 0) *
                                (parseFloat(item.unitPrice) || 0)
                            )}
                        </Text>
                    </View>
                ))}

                <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
                    <Text style={styles.addItemText}>+ Tambah Item</Text>
                </TouchableOpacity>

                {/* Summary */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Pajak ({taxRateNum}%)</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(taxAmount)}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
                    </View>
                </View>

                <FormInput
                    label="Catatan"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Catatan invoice"
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
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    removeButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    removeText: {
        fontSize: 14,
        color: '#EF4444',
        fontWeight: '600',
    },
    itemSubtotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'right',
        marginTop: 4,
    },
    addItemButton: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    addItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3B82F6',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    summaryTotal: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        marginTop: 8,
        paddingTop: 12,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#3B82F6',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginBottom: 8,
    },
});
