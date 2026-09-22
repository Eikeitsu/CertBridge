import { Provider } from "react-redux";
import { store } from "@/app/store";
import { ThemeBootstrap } from "@/features/theme/ui/ThemeBootstrap";
import { PackCopyProvider } from "@/features/theme/ui/PackCopyProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeBootstrap>
        <PackCopyProvider>{children}</PackCopyProvider>
      </ThemeBootstrap>
    </Provider>
  );
}
