import App from './app';
import { onMounted, onUnmounted, $bridge } from '../index';

export function createApp() {
  return new App();
}

export const AppProvider = $bridge<{ app: App; children: React.ReactNode }>(({ app, children = null }) => {
  app.install();
  onMounted(() => {
    app.mount();
  });

  onUnmounted(() => {
    app.unmount();
  });

  return () => children;
});
