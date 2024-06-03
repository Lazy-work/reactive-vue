import { useEffect } from "react";
import App from "./app";
import { reactivity } from "../management";
import { onMounted, onUnmounted } from "../lifecycle";

export function createApp() {
    return new App();
}

export const AppProvider = reactivity(({ app, children = null }) => {
    app.install();
    onMounted(() => {
        app.mount();
    });

    onUnmounted(() => {
        app.unmount();
    })

    return () => children;
})