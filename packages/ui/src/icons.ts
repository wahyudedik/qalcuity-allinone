// ============================================
// @qalcuity/ui — Icon Mappings
// Centralized icon name mappings for Lucide React
// ============================================

import { moduleColors } from './tokens';

// --------------------------------------------
// Navigation Icons
// --------------------------------------------

export const navIcons = {
    dashboard: 'LayoutDashboard',
    finance: 'DollarSign',
    invoices: 'FileText',
    quotations: 'FileSignature',
    payments: 'CreditCard',
    purchaseOrders: 'ShoppingCart',
    chartOfAccounts: 'BookOpen',
    crm: 'Users',
    pipeline: 'GitBranch',
    leads: 'Target',
    contacts: 'Contact',
    deals: 'Handshake',
    inventory: 'Package',
    products: 'Box',
    stock: 'Warehouse',
    categories: 'Tag',
    suppliers: 'Truck',
    hr: 'UserCog',
    employees: 'Users',
    attendance: 'Clock',
    leaves: 'CalendarOff',
    payroll: 'Wallet',
    settings: 'Settings',
    auditTrail: 'ScrollText',
    reports: 'BarChart3',
    ai: 'Bot',
    billing: 'CreditCard',
    security: 'Shield',
    notifications: 'Bell',
    integrations: 'Plug',
    team: 'UsersRound',
    search: 'Search',
} as const;

// --------------------------------------------
// Action Icons
// --------------------------------------------

export const actionIcons = {
    add: 'Plus',
    edit: 'Pencil',
    delete: 'Trash2',
    view: 'Eye',
    viewOff: 'EyeOff',
    save: 'Save',
    cancel: 'X',
    confirm: 'Check',
    close: 'X',
    refresh: 'RefreshCw',
    download: 'Download',
    upload: 'Upload',
    import: 'Upload',
    export: 'Download',
    filter: 'Filter',
    sort: 'ArrowUpDown',
    sortAsc: 'ArrowUp',
    sortDesc: 'ArrowDown',
    search: 'Search',
    print: 'Printer',
    send: 'Send',
    copy: 'Copy',
    share: 'Share2',
    link: 'ExternalLink',
    more: 'MoreHorizontal',
    moreVertical: 'MoreVertical',
    back: 'ArrowLeft',
    forward: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    expand: 'ChevronDown',
    collapse: 'ChevronUp',
    chevronRight: 'ChevronRight',
    chevronLeft: 'ChevronLeft',
} as const;

// --------------------------------------------
// Status Icons
// --------------------------------------------

export const statusIcons = {
    success: 'CheckCircle',
    error: 'XCircle',
    warning: 'AlertTriangle',
    info: 'Info',
    loading: 'Loader2',
    pending: 'Clock',
    approved: 'CheckCircle2',
    rejected: 'XCircle',
    paid: 'CheckCircle',
    unpaid: 'AlertCircle',
    overdue: 'AlertTriangle',
    cancelled: 'Ban',
    draft: 'FileEdit',
    sent: 'Send',
} as const;

// --------------------------------------------
// Module Icons (colored variants)
// --------------------------------------------

export const moduleIcons = {
    finance: { icon: 'DollarSign', color: '#10b981' },
    crm: { icon: 'Users', color: '#8b5cf6' },
    inventory: { icon: 'Package', color: '#f59e0b' },
    hr: { icon: 'UserCog', color: '#3b82f6' },
    settings: { icon: 'Settings', color: '#6b7280' },
    reports: { icon: 'BarChart3', color: '#06b6d4' },
    audit: { icon: 'ScrollText', color: '#ec4899' },
    ai: { icon: 'Bot', color: '#8b5cf6' },
} as const;

// --------------------------------------------
// Common UI Icons
// --------------------------------------------

export const uiIcons = {
    // Layout
    menu: 'Menu',
    sidebar: 'PanelLeft',
    sidebarClose: 'PanelLeftClose',
    maximize: 'Maximize2',
    minimize: 'Minimize2',
    fullscreen: 'Maximize',

    // User
    user: 'User',
    users: 'Users',
    userPlus: 'UserPlus',
    userMinus: 'UserMinus',
    userCheck: 'UserCheck',
    avatar: 'UserCircle',

    // Communication
    mail: 'Mail',
    phone: 'Phone',
    messageSquare: 'MessageSquare',
    chat: 'MessageCircle',
    whatsapp: 'MessageCircle', // Use MessageCircle as WhatsApp proxy

    // File
    file: 'File',
    fileText: 'FileText',
    filePlus: 'FilePlus',
    folder: 'Folder',
    folderOpen: 'FolderOpen',
    image: 'Image',
    paperclip: 'Paperclip',

    // Commerce
    cart: 'ShoppingCart',
    tag: 'Tag',
    percent: 'Percent',
    receipt: 'Receipt',
    bill: 'FileText',
    invoice: 'FileText',
    money: 'Banknote',
    coin: 'Coins',
    wallet: 'Wallet',

    // Time
    calendar: 'Calendar',
    calendarDays: 'CalendarDays',
    clock: 'Clock',
    timer: 'Timer',
    history: 'History',

    // Misc
    star: 'Star',
    heart: 'Heart',
    bookmark: 'Bookmark',
    flag: 'Flag',
    bell: 'Bell',
    bellOff: 'BellOff',
    lock: 'Lock',
    unlock: 'Unlock',
    key: 'Key',
    globe: 'Globe',
    map: 'MapPin',
    compass: 'Compass',
    zap: 'Zap',
    cpu: 'Cpu',
    database: 'Database',
    server: 'Server',
    cloud: 'Cloud',
    sun: 'Sun',
    moon: 'Moon',
    palette: 'Palette',
    type: 'Type',
    bold: 'Bold',
    italic: 'Italic',
    list: 'List',
    grid: 'Grid',
    columns: 'Columns',
    rows: 'Rows',
    ruler: 'Ruler',
    move: 'Move',
    grip: 'GripVertical',
    dots: 'MoreHorizontal',
    hash: 'Hash',
    atSign: 'AtSign',
    slash: 'Slash',
    minus: 'Minus',
    plus: 'Plus',
    x: 'X',
    check: 'Check',
    chevronDown: 'ChevronDown',
    chevronUp: 'ChevronUp',
    chevronRight: 'ChevronRight',
    chevronLeft: 'ChevronLeft',
    arrowUp: 'ArrowUp',
    arrowDown: 'ArrowDown',
    arrowLeft: 'ArrowLeft',
    arrowRight: 'ArrowRight',
    externalLink: 'ExternalLink',
    link: 'Link',
    unlink: 'Unlink',
    paperclipIcon: 'Paperclip',
    imageIcon: 'Image',
} as const;

// --------------------------------------------
// Helper: Get all icon names as array
// --------------------------------------------

export function getAllIconNames(): string[] {
    const allIcons: string[] = [];
    const collections = [navIcons, actionIcons, statusIcons, uiIcons];

    for (const collection of collections) {
        for (const value of Object.values(collection)) {
            if (!allIcons.includes(value)) {
                allIcons.push(value);
            }
        }
    }

    return allIcons;
}

// --------------------------------------------
// Helper: Get icon for a module
// --------------------------------------------

export function getModuleIcon(moduleId: string): string {
    const key = moduleId as keyof typeof navIcons;
    return navIcons[key] || 'Circle';
}

/**
 * Get module icon color
 */
export function getModuleColor(moduleId: string): string {
    const key = moduleId as keyof typeof moduleColors;
    const colors: Record<string, string> = {
        finance: '#10b981',
        crm: '#8b5cf6',
        inventory: '#f59e0b',
        hr: '#3b82f6',
        settings: '#6b7280',
        reports: '#06b6d4',
        audit: '#ec4899',
    };
    return colors[key] || '#6b7280';
}
