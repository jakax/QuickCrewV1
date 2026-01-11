import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from './authScreens/Login';
import Register from './authScreens/Register'; // después
import ForgotPassword from './authScreens/ForgotPassword'; // después

const Stack = createNativeStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="Register" component={Register} />
    <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
  </Stack.Navigator>
);

export default AuthStack;