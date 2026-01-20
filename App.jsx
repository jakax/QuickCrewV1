import AuthStack from './src/app/navigation/AuthStack';
import WorkerRoot from './src/app/navigation/WorkerRoot';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConfirmProvider } from './src/app/providers/ConfirmProvider';
import EmployerRoot from './src/app/navigation/EmployerRoot';
import AuthGate from "./src/app/screens/auth/AuthGate";
import { SessionProvider } from './src/app/providers/SessionProvider';
import { navigationRef } from "./src/app/navigation/navigationRef";

const RootStack = createNativeStackNavigator();



export default function App() {
  return (
    <SessionProvider>
      <ConfirmProvider>
        <NavigationContainer ref={navigationRef}>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>

            {/* Auth gate to route based on auth state */}
            <RootStack.Screen name="Gate" component={AuthGate} />
            
            {/* Auth screens */}
            <RootStack.Screen name="Auth" component={AuthStack} />

            {/* Worker specific tabs */}
            <RootStack.Screen name="WorkerRoot" component={WorkerRoot} />

            {/* Employer specific tabs */}
            <RootStack.Screen name="EmployerRoot" component={EmployerRoot} />

          </RootStack.Navigator>
        </NavigationContainer>
      </ConfirmProvider>
    </SessionProvider>
  );
}





