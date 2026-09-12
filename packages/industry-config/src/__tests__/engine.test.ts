/**
 * IndustryConfigEngine Unit Tests
 *
 * Tests untuk core industry configuration logic:
 * - Constructor / getConfig: default configs, fallback, tenant overrides
 * - getCustomFields: custom fields per entity
 * - isModuleEnabled: module visibility checks
 * - validateCustomField: single field validation
 * - validateCustomFields: multiple field validation
 * - deepMerge: nested object merging (private — tested via registerTenantConfig + getConfig)
 * - getIndustrySummary: summary stats
 * - getSupportedIndustries: list of supported industries
 * - getIndustryPack: industry pack lookup
 * - getAvailablePacks: list of available packs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IndustryConfigEngine } from '../engine';
import type { CustomField, IndustryType, TenantConfigOverride } from '../types';

describe('IndustryConfigEngine', () => {
    let engine: IndustryConfigEngine;

    beforeEach(() => {
        engine = new IndustryConfigEngine();
    });

    // ─── Constructor / getConfig ───────────────────────────────────────────

    describe('getConfig', () => {
        it('should return correct config for known industry (retail)', () => {
            const config = engine.getConfig('retail');
            expect(config).toBeDefined();
            expect(config.industry).toBe('retail');
            expect(config.name).toBe('Retail');
            expect(config.modules.finance).toBe(true);
            expect(config.modules.inventory).toBe(true);
        });

        it('should fallback to general for unknown industry type', () => {
            // Access with a value not in the type system via type assertion
            const config = engine.getConfig('unknown_industry' as IndustryType);
            expect(config).toBeDefined();
            expect(config.industry).toBe('general');
            expect(config.name).toBe('General');
        });

        it('should merge tenant config override via deepMerge', () => {
            const override: TenantConfigOverride = {
                industry: 'retail',
                config: {
                    name: 'My Retail Store',
                    modules: {
                        finance: true,
                        crm: false,
                        hr: true,
                        inventory: true,
                        billing: true,
                        analytics: true,
                    },
                },
            };
            engine.registerTenantConfig('tenant-1', override);

            const config = engine.getConfig('retail', 'tenant-1');
            expect(config.name).toBe('My Retail Store');
            // Deep merge should preserve non-overridden fields
            expect(config.modules.finance).toBe(true);
            expect(config.modules.crm).toBe(false); // overridden
        });

        it('should return default config when no tenantId provided', () => {
            const config = engine.getConfig('retail');
            expect(config.name).toBe('Retail');
        });

        it('should return default config when tenant has no override', () => {
            const config = engine.getConfig('retail', 'nonexistent-tenant');
            expect(config.name).toBe('Retail');
        });
    });

    // ─── getCustomFields ───────────────────────────────────────────────────

    describe('getCustomFields', () => {
        it('should return custom fields for known entity with fields', () => {
            const fields = engine.getCustomFields('retail', 'product');
            expect(fields.length).toBeGreaterThan(0);
            expect(fields[0].name).toBe('sku');
            expect(fields[0].type).toBe('text');
        });

        it('should return empty array for unknown entity', () => {
            const fields = engine.getCustomFields('retail', 'nonexistent_entity');
            expect(fields).toEqual([]);
        });
    });

    // ─── isModuleEnabled ───────────────────────────────────────────────────

    describe('isModuleEnabled', () => {
        it('should return true for enabled module', () => {
            expect(engine.isModuleEnabled('retail', 'finance')).toBe(true);
        });

        it('should return false for disabled module', () => {
            // services has inventory: false
            expect(engine.isModuleEnabled('services', 'inventory')).toBe(false);
        });

        it('should return false for unknown module', () => {
            expect(engine.isModuleEnabled('retail', 'nonexistent_module')).toBe(false);
        });
    });

    // ─── validateCustomField ───────────────────────────────────────────────

    describe('validateCustomField', () => {
        it('should error when required text field is empty', () => {
            const field: CustomField = { name: 'name', label: 'Name', type: 'text', required: true };
            const result = engine.validateCustomField(field, '');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(1);
        });

        it('should pass when required text field has value', () => {
            const field: CustomField = { name: 'name', label: 'Name', type: 'text', required: true };
            const result = engine.validateCustomField(field, 'hello');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should pass number field with valid number', () => {
            const field: CustomField = { name: 'qty', label: 'Qty', type: 'number', required: false };
            const result = engine.validateCustomField(field, 42);
            expect(result.valid).toBe(true);
        });

        it('should error number field with string', () => {
            const field: CustomField = { name: 'qty', label: 'Qty', type: 'number', required: false };
            const result = engine.validateCustomField(field, 'not_a_number');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(1);
        });

        it('should pass boolean field with true', () => {
            const field: CustomField = { name: 'active', label: 'Active', type: 'boolean', required: false };
            const result = engine.validateCustomField(field, true);
            expect(result.valid).toBe(true);
        });

        it('should pass select field with valid option', () => {
            const field: CustomField = {
                name: 'color', label: 'Color', type: 'select', required: false,
                options: ['Red', 'Blue', 'Green'],
            };
            const result = engine.validateCustomField(field, 'Red');
            expect(result.valid).toBe(true);
        });

        it('should error select field with invalid option', () => {
            const field: CustomField = {
                name: 'color', label: 'Color', type: 'select', required: false,
                options: ['Red', 'Blue', 'Green'],
            };
            const result = engine.validateCustomField(field, 'Yellow');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(1);
        });

        it('should pass date field with valid date string', () => {
            const field: CustomField = { name: 'dob', label: 'DOB', type: 'date', required: false };
            const result = engine.validateCustomField(field, '2024-01-15');
            expect(result.valid).toBe(true);
        });

        it('should pass optional field empty (no error)', () => {
            const field: CustomField = { name: 'note', label: 'Note', type: 'text', required: false };
            const result = engine.validateCustomField(field, '');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    });

    // ─── validateCustomFields ──────────────────────────────────────────────

    describe('validateCustomFields', () => {
        it('should return empty errors when all fields valid', () => {
            const fields: CustomField[] = [
                { name: 'name', label: 'Name', type: 'text', required: true },
                { name: 'qty', label: 'Qty', type: 'number', required: false },
            ];
            const result = engine.validateCustomFields(fields, { name: 'Test', qty: 10 });
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should return multiple errors for multiple invalid fields', () => {
            const fields: CustomField[] = [
                { name: 'name', label: 'Name', type: 'text', required: true },
                { name: 'qty', label: 'Qty', type: 'number', required: true },
            ];
            const result = engine.validateCustomFields(fields, { name: '', qty: 'bad' });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(2);
        });

        it('should return empty errors for no fields', () => {
            const result = engine.validateCustomFields([], {});
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    });

    // ─── deepMerge (tested via getConfig with tenant override) ─────────────

    describe('deepMerge (via tenant override)', () => {
        it('should merge two simple objects (override name)', () => {
            const override: TenantConfigOverride = {
                industry: 'retail',
                config: { name: 'Custom Name' },
            };
            engine.registerTenantConfig('t1', override);
            const config = engine.getConfig('retail', 't1');
            expect(config.name).toBe('Custom Name');
            // Other fields should be preserved from default
            expect(config.industry).toBe('retail');
        });

        it('should deep merge nested objects (override nested module)', () => {
            const override = {
                industry: 'retail' as IndustryType,
                config: {
                    modules: {
                        finance: true,
                        crm: false,
                        hr: true,
                        inventory: true,
                        billing: true,
                        analytics: true,
                    },
                },
            } as TenantConfigOverride;
            engine.registerTenantConfig('t2', override);
            const config = engine.getConfig('retail', 't2');
            // Overridden
            expect(config.modules.crm).toBe(false);
            // Preserved
            expect(config.modules.finance).toBe(true);
            expect(config.modules.hr).toBe(true);
        });

        it('should later values override earlier values', () => {
            // Register two overrides for same tenant (second should overwrite)
            engine.registerTenantConfig('t3', {
                industry: 'retail',
                config: { name: 'First' },
            });
            engine.registerTenantConfig('t3', {
                industry: 'retail',
                config: { name: 'Second' },
            });
            const config = engine.getConfig('retail', 't3');
            expect(config.name).toBe('Second');
        });
    });

    // ─── getIndustrySummary ────────────────────────────────────────────────

    describe('getIndustrySummary', () => {
        it('should return correct summary stats', () => {
            const summary = engine.getIndustrySummary('retail');
            expect(summary).not.toBeNull();
            expect(summary!.name).toBe('Retail');
            expect(summary!.description).toBeDefined();
            expect(summary!.enabledModules).toContain('finance');
            expect(summary!.customFieldEntities).toContain('product');
            expect(summary!.widgetCount).toBeGreaterThan(0);
            expect(summary!.reportCount).toBeGreaterThan(0);
        });

        it('should return null for unknown industry', () => {
            const summary = engine.getIndustrySummary('nonexistent' as IndustryType);
            expect(summary).toBeNull();
        });
    });

    // ─── getSupportedIndustries ────────────────────────────────────────────

    describe('getSupportedIndustries', () => {
        it('should return all supported industries', () => {
            const industries = engine.getSupportedIndustries();
            expect(industries).toContain('retail');
            expect(industries).toContain('manufacturing');
            expect(industries).toContain('general');
            expect(industries.length).toBeGreaterThanOrEqual(10);
        });
    });

    // ─── getIndustryPack ───────────────────────────────────────────────────

    describe('getIndustryPack', () => {
        it('should return pack for known packId', () => {
            const pack = engine.getIndustryPack('restaurant');
            expect(pack).toBeDefined();
            expect(pack!.id).toBe('restaurant');
        });

        it('should return undefined for unknown packId', () => {
            const pack = engine.getIndustryPack('nonexistent');
            expect(pack).toBeUndefined();
        });
    });

    // ─── getAvailablePacks ─────────────────────────────────────────────────

    describe('getAvailablePacks', () => {
        it('should return array of available packs', () => {
            const packs = engine.getAvailablePacks();
            expect(Array.isArray(packs)).toBe(true);
            expect(packs.length).toBeGreaterThan(0);
        });
    });

    // ─── register/unregister tenant config ──────────────────────────────────

    describe('registerTenantConfig / unregisterTenantConfig', () => {
        it('should register and then unregister tenant config', () => {
            const override: TenantConfigOverride = {
                industry: 'retail',
                config: { name: 'Test Tenant' },
            };
            engine.registerTenantConfig('t-removable', override);
            expect(engine.getConfig('retail', 't-removable').name).toBe('Test Tenant');

            engine.unregisterTenantConfig('t-removable');
            expect(engine.getConfig('retail', 't-removable').name).toBe('Retail'); // back to default
        });

        it('should clear all tenant cache', () => {
            engine.registerTenantConfig('t-a', {
                industry: 'retail',
                config: { name: 'A' },
            });
            engine.clearTenantCache();
            expect(engine.getConfig('retail', 't-a').name).toBe('Retail');
        });
    });
});
