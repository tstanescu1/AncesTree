import { ConvexProvider, ConvexReactClient } from "convex/react";
import MainScreen from "./src/MainScreen";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL);

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <MainScreen />
    </ConvexProvider>
  );
}
