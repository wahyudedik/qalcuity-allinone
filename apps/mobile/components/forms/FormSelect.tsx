import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
} from 'react-native';

export interface FormSelectOption {
    label: string;
    value: string;
}

export interface FormSelectProps {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    options: FormSelectOption[];
    placeholder?: string;
    error?: string;
    required?: boolean;
}

export function FormSelect({
    label,
    value,
    onValueChange,
    options,
    placeholder = 'Pilih...',
    error,
    required = false,
}: FormSelectProps) {
    const [visible, setVisible] = useState(false);

    const selectedLabel = options.find((o) => o.value === value)?.label || '';

    const handleSelect = (item: FormSelectOption) => {
        onValueChange(item.value);
        setVisible(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
                style={[styles.trigger, error ? styles.triggerError : null]}
                onPress={() => setVisible(true)}
                accessibilityLabel={label}
                accessibilityRole="button"
                accessibilityState={{ expanded: visible }}
            >
                <Text
                    style={[
                        styles.triggerText,
                        !selectedLabel ? styles.placeholderText : null,
                    ]}
                >
                    {selectedLabel || placeholder}
                </Text>
                <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.sheet}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <Text style={styles.sheetClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        item.value === value && styles.optionSelected,
                                    ]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            item.value === value && styles.optionTextSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.value === value && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    required: {
        color: '#EF4444',
    },
    trigger: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
    },
    triggerError: {
        borderColor: '#EF4444',
    },
    triggerText: {
        fontSize: 16,
        color: '#111827',
        flex: 1,
    },
    placeholderText: {
        color: '#9CA3AF',
    },
    chevron: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '60%',
        paddingBottom: 34,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    sheetClose: {
        fontSize: 18,
        color: '#6B7280',
        padding: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    optionSelected: {
        backgroundColor: '#EFF6FF',
    },
    optionText: {
        fontSize: 16,
        color: '#374151',
    },
    optionTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    checkmark: {
        fontSize: 16,
        color: '#3B82F6',
        fontWeight: '700',
    },
});
