import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onClear?: () => void;
    filterOptions?: { label: string; value: string }[];
    activeFilter?: string;
    onFilterChange?: (value: string) => void;
}

export default function SearchBar({
    value,
    onChangeText,
    placeholder = 'Cari...',
    onClear,
    filterOptions,
    activeFilter,
    onFilterChange,
}: SearchBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.searchRow}>
                <View style={styles.searchInputContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="#9CA3AF"
                        returnKeyType="search"
                    />
                    {value.length > 0 && (
                        <TouchableOpacity onPress={onClear || (() => onChangeText(''))} style={styles.clearButton}>
                            <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {filterOptions && filterOptions.length > 0 && (
                <View style={styles.filterRow}>
                    {filterOptions.map((filter) => (
                        <TouchableOpacity
                            key={filter.value}
                            style={[
                                styles.filterChip,
                                activeFilter === filter.value && styles.filterChipActive,
                            ]}
                            onPress={() => onFilterChange?.(filter.value)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    activeFilter === filter.value && styles.filterTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        backgroundColor: '#F3F4F6',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
        padding: 0,
    },
    clearButton: {
        padding: 4,
        marginLeft: 4,
    },
    clearText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
});
