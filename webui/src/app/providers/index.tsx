import { Provider } from "react-redux";
import { store } from "@/app/store";
import { ThemeBootstrap } from "@/features/theme/ui/ThemeBootstrap";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeBootstrap>{children}</ThemeBootstrap>
    </Provider>
  );
}
