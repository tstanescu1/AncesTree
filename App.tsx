import { ConvexProvider, ConvexReactClient } from "convex/react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainScreen from "./src/MainScreen";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convex}>
        <MainScreen />
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}
