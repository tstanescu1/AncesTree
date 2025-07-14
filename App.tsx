import { ConvexProvider, ConvexReactClient } from "convex/react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MainScreen from "./src/MainScreen";
import { LocationProvider } from './src/hooks/LocationContext';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convex}>
        <LocationProvider>
          <MainScreen />
        </LocationProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}
