// ============================================
// @qalcuity/ui
// Shared design tokens + React components
// ============================================

// --------------------------------------------
// Design Tokens
// --------------------------------------------
export {
    brandColors,
    semanticColors,
    neutralColors,
    moduleColors,
    spacing,
    fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    letterSpacings,
    borderRadius,
    shadows,
    zIndex,
    transitions,
    breakpoints,
    containers,
} from './tokens';

// --------------------------------------------
// Themes
// --------------------------------------------
export {
    lightTheme,
    darkTheme,
    getTheme,
    getSystemTheme,
    getThemeColorsForTailwind,
} from './theme';

// --------------------------------------------
// Icons
// --------------------------------------------
export {
    navIcons,
    actionIcons,
    statusIcons,
    moduleIcons,
    uiIcons,
    getAllIconNames,
    getModuleIcon,
    getModuleColor,
} from './icons';

// --------------------------------------------
// Components
// --------------------------------------------

// Button
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

// Input
export { Input } from './components/Input';
export type { InputProps, InputType } from './components/Input';

// Select
export { Select } from './components/Select';
export type { SelectProps, SelectOption } from './components/Select';

// Table
export {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from './components/Table';
export type {
    TableProps,
    TableHeaderProps,
    TableBodyProps,
    TableRowProps,
    TableHeadProps,
    TableCellProps,
} from './components/Table';

// Modal
export { Modal } from './components/Modal';
export type { ModalProps, ModalSize } from './components/Modal';

// Card
export {
    Card,
    CardHeader,
    CardBody,
    CardFooter,
} from './components/Card';
export type {
    CardProps,
    CardHeaderProps,
    CardBodyProps,
    CardFooterProps,
} from './components/Card';

// Badge
export { Badge } from './components/Badge';
export type { BadgeProps, BadgeVariant } from './components/Badge';

// Alert
export { Alert } from './components/Alert';
export type { AlertProps, AlertVariant } from './components/Alert';

// Spinner
export { Spinner } from './components/Spinner';
export type { SpinnerProps, SpinnerSize } from './components/Spinner';

// --------------------------------------------
// Types
// --------------------------------------------
export type { Theme } from './theme';
