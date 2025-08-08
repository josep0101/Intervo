import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function injectCss() {
  let cssContent = "";

  return {
    name: "inject-css",
    transform(code, id) {
      if (id.endsWith(".css")) {
        cssContent += code;
        // Return an empty module so that this CSS isn't output separately.
        return "";
      }
    },
    generateBundle(options, bundle) {
      // Loop over JS bundle files and inject our code.
      for (const fileName in bundle) {
        if (fileName.endsWith(".js")) {
          // Combine your Tailwind variables (adjust as needed) with the accumulated CSS.
          const tailwindVars = `
:host {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 10% 3.9%;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
  --radius: 0.5rem;
}
`;
          const combinedCSS = tailwindVars + cssContent;
          const safeCSS = JSON.stringify(combinedCSS);

          // This injection snippet patches WidgetLibrary.init so that when the widget mounts:
          // • It attaches a shadow root (if not already attached)
          // • It injects the combined CSS into that shadow DOM
          // • It sets up a MutationObserver on document.body that watches for any node with
          //   data-radix-popper-content-wrapper and re-parents it into the widget's shadow root.
          const injection = `
(function(){
  if (typeof window.WidgetLibrary === 'undefined') {
    console.error('WidgetLibrary is not defined.');
    return;
  }
  const originalInit = window.WidgetLibrary.init;
  window.WidgetLibrary.init = function(widgetId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found');
      return;
    }
    var shadow;
    if (container.__shadowAttached) {
      shadow = container.__shadowRoot;
    } else {
      try {
        shadow = container.attachShadow({ mode: 'open' });
        container.__shadowAttached = true;
        container.__shadowRoot = shadow;
      } catch(e) {
        console.error('Failed to attach shadow:', e);
        return;
      }
    }
    if (!shadow.querySelector('style[data-injected]')) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-injected', 'true');
      styleEl.textContent = ${safeCSS};
      shadow.appendChild(styleEl);
    }
    return originalInit.call(this, widgetId, containerId);
  };
})();
`;

          bundle[fileName].code = bundle[fileName].code + injection;
        }
      }
    },
  };
}

// Export a function that returns the config object
export default defineConfig(({ mode, command }) => {
  // Load .env file variables based on mode (development/production)
  // Prefix defaults to 'VITE_' but we don't strictly need it here
  const env = loadEnv(mode, process.cwd(), "");
  const buildFormat = env.VITE_BUILD_FORMAT || "es"; // Default to 'es' if not set

  console.log(`Building format: ${buildFormat}, Mode: ${mode}`);

  // Base config shared between builds
  const baseConfig = {
    plugins: [react(), injectCss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode), // Vite sets mode to 'production' for build
    },
  };

  // --- UMD Build Configuration ---
  if (buildFormat === "umd") {
    return {
      ...baseConfig,
      plugins: [...baseConfig.plugins], // Add CSS injection ONLY to UMD build
      build: {
        outDir: "dist",
        lib: {
          entry: "src/index.jsx",
          name: "WidgetLibrary",
          fileName: () => `widget-library.umd.js`,
          formats: ["umd"],
        },
        emptyOutDir: true, // UMD build runs first, allow it to clear the dir
        cssCodeSplit: false,
        rollupOptions: {
          external: ["react", "react-dom"], // Keep jsx-runtime bundled
          output: {
            globals: {
              react: "React",
              "react-dom": "ReactDOM",
            },
          },
        },
      },
    };
  }

  // --- ES Build Configuration (Default) ---
  else {
    return {
      ...baseConfig,
      build: {
        outDir: "dist",
        lib: {
          entry: "src/index.jsx",
          fileName: () => `voxa-widget.es.js`,
          formats: ["es"],
        },
        emptyOutDir: false, // ES build runs second, don't clear UMD output
        cssCodeSplit: true,
        rollupOptions: {
          external: ["react", "react-dom", "react/jsx-runtime"], // Externalize jsx-runtime
        },
      },
    };
  }
});
