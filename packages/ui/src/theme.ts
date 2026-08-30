// ============================================
// @qalcuity/ui — Theme Definitions
// Light and dark theme configurations
// ============================================

import {
    brandColors,
    semanticColors,
    neutralColors,
    moduleColors,
    shadows,
    borderRadius,
    fontFamilies,
    fontSizes,
    fontWeights,
    spacing,
} from './tokens';

// --------------------------------------------
// Theme Interface
// --------------------------------------------

export interface Theme {
    name: 'light' | 'dark';
    colors: {
        // Brand
        primary: typeof brandColors;
        // Semantic
        success: typeof semanticColors.success;
        warning: typeof semanticColors.warning;
        error: typeof semanticColors.error;
        info: typeof semanticColors.info;
        // Module
        module: typeof moduleColors;
        // Background
        bg: {
            primary: string;
            secondary: string;
            tertiary: string;
            inverse: string;
            card: string;
            overlay: string;
        };
        // Text
        text: {
            primary: string;
            secondary: string;
            tertiary: string;
            inverse: string;
            link: string;
            linkHover: string;
        };
        // Border
        border: {
            primary: string;
            secondary: string;
            focus: string;
            error: string;
        };
        // Input
        input: {
            bg: string;
            border: string;
            borderFocus: string;
            placeholder: string;
            text: string;
        };
        // Table
        table: {
            headerBg: string;
            headerText: string;
            rowHover: string;
            rowBorder: string;
            stripedBg: string;
        };
        // Sidebar
        sidebar: {
            bg: string;
            text: string;
            textActive: string;
            bgActive: string;
            hover: string;
            border: string;
        };
    };
    shadows: Record<string, string>;
    borderRadius: typeof borderRadius;
    fontFamilies: typeof fontFamilies;
    fontSizes: typeof fontSizes;
    fontWeights: typeof fontWeights;
    spacing: typeof spacing;
}

// --------------------------------------------
// Light Theme
// --------------------------------------------

export const lightTheme: Theme = {
    name: 'light',
    colors: {
        primary: brandColors,
        success: semanticColors.success,
        warning: semanticColors.warning,
        error: semanticColors.error,
        info: semanticColors.info,
        module: moduleColors,
        bg: {
            primary: neutralColors.white,
            secondary: neutralColors[50],
            tertiary: neutralColors[100],
            inverse: neutralColors[900],
            card: neutralColors.white,
            overlay: 'rgba(0, 0, 0, 0.5)',
        },
        text: {
            primary: neutralColors[900],
            secondary: neutralColors[600],
            tertiary: neutralColors[400],
            inverse: neutralColors.white,
            link: brandColors.primary[600],
            linkHover: brandColors.primary[700],
        },
        border: {
            primary: neutralColors[200],
            secondary: neutralColors[100],
            focus: brandColors.primary[500],
            error: semanticColors.error.DEFAULT,
        },
        input: {
            bg: neutralColors.white,
            border: neutralColors[300],
            borderFocus: brandColors.primary[500],
            placeholder: neutralColors[400],
            text: neutralColors[900],
        },
        table: {
            headerBg: neutralColors[50],
            headerText: neutralColors[600],
            rowHover: neutralColors[50],
            rowBorder: neutralColors[100],
            stripedBg: neutralColors[50],
        },
        sidebar: {
            bg: neutralColors.white,
            text: neutralColors[600],
            textActive: brandColors.primary[600],
            bgActive: brandColors.primary[50],
            hover: neutralColors[50],
            border: neutralColors[200],
        },
    },
    shadows: { ...shadows } as Record<string, string>,
    borderRadius,
    fontFamilies,
    fontSizes,
    fontWeights,
    spacing,
};

// --------------------------------------------
// Dark Theme
// --------------------------------------------

export const darkTheme: Theme = {
    name: 'dark',
    colors: {
        primary: brandColors,
        success: semanticColors.success,
        warning: semanticColors.warning,
        error: semanticColors.error,
        info: semanticColors.info,
        module: moduleColors,
        bg: {
            primary: neutralColors[950],
            secondary: neutralColors[900],
            tertiary: neutralColors[800],
            inverse: neutralColors.white,
            card: neutralColors[900],
            overlay: 'rgba(0, 0, 0, 0.7)',
        },
        text: {
            primary: neutralColors[50],
            secondary: neutralColors[400],
            tertiary: neutralColors[500],
            inverse: neutralColors[900],
            link: brandColors.primary[400],
            linkHover: brandColors.primary[300],
        },
        border: {
            primary: neutralColors[700],
            secondary: neutralColors[800],
            focus: brandColors.primary[500],
            error: semanticColors.error.DEFAULT,
        },
        input: {
            bg: neutralColors[800],
            border: neutralColors[700],
            borderFocus: brandColors.primary[500],
            placeholder: neutralColors[500],
            text: neutralColors[50],
        },
        table: {
            headerBg: neutralColors[800],
            headerText: neutralColors[300],
            rowHover: neutralColors[800],
            rowBorder: neutralColors[700],
            stripedBg: neutralColors[900],
        },
        sidebar: {
            bg: neutralColors[900],
            text: neutralColors[400],
            textActive: brandColors.primary[400],
            bgActive: 'rgba(59, 130, 246, 0.1)',
            hover: neutralColors[800],
            border: neutralColors[700],
        },
    },
    shadows: {
        ...shadows,
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
    } as Record<string, string>,
    borderRadius,
    fontFamilies,
    fontSizes,
    fontWeights,
    spacing,
};

// --------------------------------------------
// Theme Utilities
// --------------------------------------------

/**
 * Get theme by name
 */
export function getTheme(name: 'light' | 'dark'): Theme {
    return name === 'dark' ? darkTheme : lightTheme;
}

/**
 * Detect system preference
 */
export function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get Tailwind CSS class for theme colors
 * Useful for converting design tokens to Tailwind classes
 */
export function getThemeColorsForTailwind(theme: Theme) {
    return {
        primary: theme.colors.primary.primary[500],
        'primary-hover': theme.colors.primary.primary[600],
        'bg-primary': theme.colors.bg.primary,
        'bg-secondary': theme.colors.bg.secondary,
        'text-primary': theme.colors.text.primary,
        'text-secondary': theme.colors.text.secondary,
        'border-primary': theme.colors.border.primary,
        'sidebar-bg': theme.colors.sidebar.bg,
        'sidebar-text': theme.colors.sidebar.text,
        'sidebar-active': theme.colors.sidebar.textActive,
        'sidebar-active-bg': theme.colors.sidebar.bgActive,
    };
}
