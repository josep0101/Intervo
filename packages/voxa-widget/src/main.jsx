import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App.jsx";
import { WidgetProvider } from "./context/WidgetContext";
import PropTypes from "prop-types";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line no-unused-vars
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console with stack trace
    console.error("Error details:", {
      error: error,
      stackTrace: errorInfo.componentStack,
    });

    // Show toast notification
    toast.error("Something went wrong! Check console for details.");
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <h2>Oops! Something went wrong.</h2>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <WidgetProvider widgetId="7f151bac-19ff-4206-b1bd-dbf71e44fdd5">
        <App widgetId="7f151bac-19ff-4206-b1bd-dbf71e44fdd5" />
        <ToastContainer position="top-right" autoClose={5000} />
      </WidgetProvider>
    </ErrorBoundary>
  </StrictMode>
);
