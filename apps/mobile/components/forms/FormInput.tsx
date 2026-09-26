import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

export interface FormInputProps extends Omit<TextInputProps, 'onChangeText'> {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    multiline?: boolean;
    secureTextEntry?: boolean;
    keyboardType?: TextInputProps['keyboardType'];
}

export function FormInput({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    required = false,
    multiline = false,
    secureTextEntry = false,
    keyboardType = 'default',
    ...rest
}: FormInputProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
                style={[
                    styles.input,
                    multiline && styles.multiline,
                    error ? styles.inputError : null,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                accessibilityLabel={label}
                accessibilityHint={required ? 'Field ini wajib diisi' : undefined}
                {...rest}
            />
            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}
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
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
        minHeight: 44,
    },
    multiline: {
        minHeight: 100,
        paddingTop: 10,
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
});
