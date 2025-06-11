import { ConvexProvider, ConvexReactClient } from "convex/react";
import Constants from "expo-constants";
import MainScreen from "./src/MainScreen";

const convex = new ConvexReactClient(Constants.expoConfig?.extra?.CONVEX_URL);

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <MainScreen />
    </ConvexProvider>
  );
}
