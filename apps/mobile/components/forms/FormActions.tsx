import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export interface FormActionsProps {
    onSave: () => void;
    onCancel: () => void;
    isLoading: boolean;
    saveLabel?: string;
    cancelLabel?: string;
}

export function FormActions({
    onSave,
    onCancel,
    isLoading,
    saveLabel = 'Simpan',
    cancelLabel = 'Batal',
}: FormActionsProps) {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isLoading}
                accessibilityLabel={cancelLabel}
                accessibilityRole="button"
            >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={onSave}
                disabled={isLoading}
                accessibilityLabel={saveLabel}
                accessibilityRole="button"
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Text style={styles.saveText}>{saveLabel}</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 8,
        paddingBottom: 32,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    saveButton: {
        backgroundColor: '#3B82F6',
    },
    saveButtonDisabled: {
        backgroundColor: '#93C5FD',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
