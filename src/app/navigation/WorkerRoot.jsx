import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WorkerJobDetails from "../screens/worker/WorkerJobDetails";
import WorkerTabs from "./WorkerTabs";

const Stack = createNativeStackNavigator();

const WorkerRoot = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
      <Stack.Screen name="WorkerJobDetails" component={WorkerJobDetails} options={{ headerShown: true, title: "Job details" }} />
    </Stack.Navigator>
  );
};

export default WorkerRoot;