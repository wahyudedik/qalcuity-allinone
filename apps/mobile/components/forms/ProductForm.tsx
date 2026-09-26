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
import { FormActions } from './FormActions';
import type { MobileProduct, CreateProductPayload, UpdateProductPayload } from '../../lib/api';

export interface ProductFormProps {
    initialData?: MobileProduct;
    onSubmit: (data: CreateProductPayload | UpdateProductPayload) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

export function ProductForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: ProductFormProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [sku, setSku] = useState(initialData?.sku || '');
    const [price, setPrice] = useState(
        initialData?.price ? String(initialData.price) : ''
    );
    const [cost, setCost] = useState(
        initialData?.cost ? String(initialData.cost) : ''
    );
    const [stock, setStock] = useState(
        initialData?.stock !== undefined ? String(initialData.stock) : ''
    );
    const [unit, setUnit] = useState(initialData?.unit || 'pcs');
    const [category, setCategory] = useState(initialData?.categoryName || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [minStock, setMinStock] = useState(
        initialData?.minStock !== undefined ? String(initialData.minStock) : ''
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Nama produk wajib diisi';
        }

        if (!sku.trim()) {
            newErrors.sku = 'SKU wajib diisi';
        }

        const priceNum = parseFloat(price);
        if (!price || isNaN(priceNum) || priceNum <= 0) {
            newErrors.price = 'Harga harus lebih dari 0';
        }

        if (cost) {
            const costNum = parseFloat(cost);
            if (isNaN(costNum) || costNum < 0) {
                newErrors.cost = 'Harga beli tidak boleh negatif';
            }
        }

        if (stock) {
            const stockNum = parseInt(stock, 10);
            if (isNaN(stockNum) || stockNum < 0) {
                newErrors.stock = 'Stok tidak boleh negatif';
            }
        }

        if (minStock) {
            const minStockNum = parseInt(minStock, 10);
            if (isNaN(minStockNum) || minStockNum < 0) {
                newErrors.minStock = 'Stok minimum tidak boleh negatif';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            const payload: CreateProductPayload | UpdateProductPayload = {
                name: name.trim(),
                sku: sku.trim(),
                price: parseFloat(price),
                cost: cost ? parseFloat(cost) : 0,
                stock: stock ? parseInt(stock, 10) : 0,
                unit: unit.trim() || 'pcs',
                description: description.trim() || null,
                minStock: minStock ? parseInt(minStock, 10) : 0,
            };
            await onSubmit(payload);
        } catch (err) {
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Gagal menyimpan produk'
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
                <Text style={styles.sectionTitle}>Informasi Produk</Text>

                <FormInput
                    label="Nama Produk"
                    value={name}
                    onChangeText={setName}
                    placeholder="Nama produk"
                    error={errors.name}
                    required
                />

                <FormInput
                    label="SKU"
                    value={sku}
                    onChangeText={setSku}
                    placeholder="SKU-001"
                    error={errors.sku}
                    required
                />

                <Text style={styles.sectionTitle}>Harga & Stok</Text>

                <FormInput
                    label="Harga Jual"
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0"
                    keyboardType="numeric"
                    error={errors.price}
                    required
                />

                <FormInput
                    label="Harga Beli"
                    value={cost}
                    onChangeText={setCost}
                    placeholder="0"
                    keyboardType="numeric"
                    error={errors.cost}
                />

                <View style={styles.row}>
                    <View style={styles.halfField}>
                        <FormInput
                            label="Stok"
                            value={stock}
                            onChangeText={setStock}
                            placeholder="0"
                            keyboardType="numeric"
                            error={errors.stock}
                        />
                    </View>
                    <View style={styles.halfField}>
                        <FormInput
                            label="Stok Minimum"
                            value={minStock}
                            onChangeText={setMinStock}
                            placeholder="0"
                            keyboardType="numeric"
                            error={errors.minStock}
                        />
                    </View>
                </View>

                <FormInput
                    label="Satuan"
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="pcs, kg, liter"
                />

                <FormInput
                    label="Kategori"
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Nama kategori"
                />

                <FormInput
                    label="Deskripsi"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Deskripsi produk"
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
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
});
