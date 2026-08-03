import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import FinanceScreen from './screens/FinanceScreen';
import CRMScreen from './screens/CRMScreen';
import InventoryScreen from './screens/InventoryScreen';
import HRScreen from './screens/HRScreen';

export type RootStackParamList = {
    Home: undefined;
    Dashboard: undefined;
    Finance: undefined;
    CRM: undefined;
    Inventory: undefined;
    HR: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator
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
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ title: 'Qalcuity' }}
                    />
                    <Stack.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{ title: 'Dashboard' }}
                    />
                    <Stack.Screen
                        name="Finance"
                        component={FinanceScreen}
                        options={{ title: 'Finance' }}
                    />
                    <Stack.Screen
                        name="CRM"
                        component={CRMScreen}
                        options={{ title: 'Sales & CRM' }}
                    />
                    <Stack.Screen
                        name="Inventory"
                        component={InventoryScreen}
                        options={{ title: 'Inventory' }}
                    />
                    <Stack.Screen
                        name="HR"
                        component={HRScreen}
                        options={{ title: 'HR & People' }}
                    />
                </Stack.Navigator>
                <StatusBar style="light" />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}
