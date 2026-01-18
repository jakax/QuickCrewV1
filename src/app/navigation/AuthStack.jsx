import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from '../screens/auth/Login';
import RegisterWorker from '../screens/auth/RegisterWorker';
import RegisterEmployer from '../screens/auth/RegisterEmployer';
import ForgotPassword from '../screens/auth/ForgotPassword'; // después
import CreateOrganizationScreen from '../screens/org/CreateOrganizationScreen';

const Stack = createNativeStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="RegisterWorker" component={RegisterWorker} />
    <Stack.Screen name="RegisterEmployer" component={RegisterEmployer} />
    <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    <Stack.Screen 
      name="CreateOrganization"
      component={CreateOrganizationScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default AuthStack;