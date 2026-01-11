import { createNativeStackNavigator } from "@react-navigation/native-stack";
import JobsList from "./JobsList";
import JobDetails from "./JobDetails";

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="JobsList" component={JobsList} />
      <Stack.Screen name="JobDetails" component={JobDetails} />
    </Stack.Navigator>
  );
};

export default HomeStack;