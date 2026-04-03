import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EmployerEditJob from "../screens/employer/EmployerEditJob";
import CreateJobScreen from "../screens/employer/CreateJobScreen";
import EmployerTabs from "./EmployerTabs";
import EmployerJobApplicants from "../screens/employer/EmployerJobApplicants";
import AssignedWorkerDetails from "../screens/employer/AssignedWorkerDetails";

const Stack = createNativeStackNavigator();

const EmployerRoot = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployerTabs" component={EmployerTabs} />
      <Stack.Screen name="EmployerEditJob" component={EmployerEditJob} />
      <Stack.Screen 
        name="EmployerJobApplicants"
        component={EmployerJobApplicants}
        options={{ headerShown: true, title: "Applicants" }}
      />
      <Stack.Screen 
        name="CreateJob"
        component={CreateJobScreen}
      />
      <Stack.Screen
        name="AssignedWorkerDetails"
        component={AssignedWorkerDetails}
        options={{ headerShown: true, title: "Assigned Worker" }}
      />
    </Stack.Navigator>
  );
};

export default EmployerRoot;