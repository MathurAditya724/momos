import AppRoutes from "./pages";
import AppProvider from "./providers/AppProvider";

export default function App() {
  return (
    <div>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </div>
  );
}
