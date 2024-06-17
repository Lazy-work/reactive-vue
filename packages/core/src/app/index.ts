import App from "./app";
import { $reactive } from "../management";
import { onMounted, onUnmounted } from "../lifecycle";

export function createApp() {
    return new App();
}

export const AppProvider = $reactive(({ app, children = null }) => {
    app.install();
    onMounted(() => {
        app.mount();
    });

    onUnmounted(() => {
        app.unmount();
    })

    return () => children;
})