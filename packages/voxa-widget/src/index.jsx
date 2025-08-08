import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WidgetProvider } from "./context/WidgetContext";
import "./index.css";

// Keep track of the root for unmounting
let reactRoot = null;

export const init = (widgetId, containerId) => {
  console.log(widgetId, "******widgetId******");
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  try {
    // Reuse an existing shadow root if available; otherwise, attach a new one.
    const shadow =
      container.shadowRoot || container.attachShadow({ mode: "open" });

    // Create a container div inside the shadow DOM if not already present.
    let widgetRoot = shadow.querySelector(`#widget-root-${containerId}`);
    if (!widgetRoot) {
      widgetRoot = document.createElement("div");
      widgetRoot.id = `widget-root-${containerId}`;
      widgetRoot.style.cssText = "display: contents;"; // Prevent extra wrapper affecting layout
      shadow.appendChild(widgetRoot);
    }

    // Create a mounting point for React
    const mountPoint = document.createElement("div");
    widgetRoot.appendChild(mountPoint);

    // Use createRoot API
    reactRoot = ReactDOM.createRoot(mountPoint);
    reactRoot.render(
      <React.StrictMode>
        <WidgetProvider widgetId={widgetId}>
          <App widgetId={widgetId} />
        </WidgetProvider>
      </React.StrictMode>
    );

    return () => {
      // Cleanup function using root.unmount()
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null; // Clear the reference
      }
      // Optionally, clean up the mountPoint
      if (widgetRoot && widgetRoot.contains(mountPoint)) {
        widgetRoot.removeChild(mountPoint);
      }
    };
  } catch (error) {
    console.error("Failed to initialize widget:", error);
    return null;
  }
};

// Named exports for use in React applications
export { App, WidgetProvider };

// Default export for UMD/embedding via init function
export default { init };
