import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EmployerEditJob from "../screens/employer/EmployerEditJob";
import CreateJobScreen from "../screens/employer/CreateJobScreen";
import EmployerTabs from "./EmployerTabs";

const Stack = createNativeStackNavigator();

const EmployerRoot = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployerTabs" component={EmployerTabs} />
      <Stack.Screen name="EmployerEditJob" component={EmployerEditJob} options={{ headerShown: true, title: "Edit Shift" }} />
      <Stack.Screen 
        name="CreateJob"
        component={CreateJobScreen}
        options={{ headerShown: true, title: "Create Shift" }}
      />
    </Stack.Navigator>
  );
};

export default EmployerRoot;