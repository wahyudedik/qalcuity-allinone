/**
 * App.tsx — Main Entry Point for Qalcuity Mobile
 * 
 * Navigation structure:
 * - Auth Stack: Login, Register (when not authenticated)
 * - Main Stack: Home, Dashboard, Finance, CRM, Inventory, HR + Detail screens
 * 
 * Wraps everything with:
 * - SafeAreaProvider (safe area handling)
 * - AuthProvider (authentication state management)
 * - NavigationContainer (React Navigation)
 */

import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Auth
import { AuthProvider, useAuth } from './lib/auth-context';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

// Screens
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import FinanceScreen from './screens/FinanceScreen';
import CRMScreen from './screens/CRMScreen';
import InventoryScreen from './screens/InventoryScreen';
import HRScreen from './screens/HRScreen';

// Detail Screens
import InvoiceDetailScreen from './screens/InvoiceDetailScreen';
import LeadDetailScreen from './screens/LeadDetailScreen';
import DealDetailScreen from './screens/DealDetailScreen';
import ContactDetailScreen from './screens/ContactDetailScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import EmployeeDetailScreen from './screens/EmployeeDetailScreen';

// ─── Navigation Types ─────────────────────────────────────────────────────────

/**
 * MainStackParamList — typed navigation for the main app screens.
 * Used internally by MainNavigator and referenced by all screen components.
 */
export type MainStackParamList = {
    Home: undefined;
    Dashboard: undefined;
    Finance: undefined;
    CRM: undefined;
    Inventory: undefined;
    HR: undefined;
    // Detail screens
    InvoiceDetail: { id: string };
    LeadDetail: { id: string };
    DealDetail: { id: string };
    ContactDetail: { id: string };
    ProductDetail: { id: string };
    EmployeeDetail: { id: string };
};

/**
 * RootStackParamList — backward-compatible export.
 * All existing screen components import this type for navigation typing.
 * This is intentionally the same as MainStackParamList so all screens
 * can continue using `NativeStackNavigationProp<RootStackParamList, 'ScreenName'>`.
 */
export type RootStackParamList = MainStackParamList;

/**
 * AuthStackParamList — navigation type for auth screens (Login, Register).
 */
type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

/**
 * RootNavigationParamList — top-level navigator with Auth and Main screens.
 */
type RootNavigationParamList = {
    Auth: undefined;
    Main: undefined;
};

// ─── Stacks ───────────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const RootStack = createNativeStackNavigator<RootNavigationParamList>();

// ─── Auth Navigator ───────────────────────────────────────────────────────────

function AuthNavigator() {
    return (
        <AuthStack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
    );
}

// ─── Main Navigator ───────────────────────────────────────────────────────────

function MainNavigator() {
    return (
        <MainStack.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#2563EB',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <MainStack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Qalcuity' }}
            />
            <MainStack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ title: 'Dashboard' }}
            />
            <MainStack.Screen
                name="Finance"
                component={FinanceScreen}
                options={{ title: 'Finance' }}
            />
            <MainStack.Screen
                name="CRM"
                component={CRMScreen}
                options={{ title: 'Sales & CRM' }}
            />
            <MainStack.Screen
                name="Inventory"
                component={InventoryScreen}
                options={{ title: 'Inventory' }}
            />
            <MainStack.Screen
                name="HR"
                component={HRScreen}
                options={{ title: 'HR & People' }}
            />
            {/* Detail Screens */}
            <MainStack.Screen
                name="InvoiceDetail"
                component={InvoiceDetailScreen}
                options={{ title: 'Detail Invoice' }}
            />
            <MainStack.Screen
                name="LeadDetail"
                component={LeadDetailScreen}
                options={{ title: 'Detail Lead' }}
            />
            <MainStack.Screen
                name="DealDetail"
                component={DealDetailScreen}
                options={{ title: 'Detail Deal' }}
            />
            <MainStack.Screen
                name="ContactDetail"
                component={ContactDetailScreen}
                options={{ title: 'Detail Kontak' }}
            />
            <MainStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{ title: 'Detail Produk' }}
            />
            <MainStack.Screen
                name="EmployeeDetail"
                component={EmployeeDetailScreen}
                options={{ title: 'Detail Karyawan' }}
            />
        </MainStack.Navigator>
    );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
    return (
        <View style={loadingStyles.container}>
            <ActivityIndicator size="large" color="#2563EB" />
        </View>
    );
}

const loadingStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
});

// ─── Root Navigator ───────────────────────────────────────────────────────────

function RootNavigator() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                <RootStack.Screen name="Main" component={MainNavigator} />
            ) : (
                <RootStack.Screen name="Auth" component={AuthNavigator} />
            )}
        </RootStack.Navigator>
    );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <NavigationContainer>
                    <RootNavigator />
                    <StatusBar style="light" />
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
