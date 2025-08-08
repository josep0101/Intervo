"use client";
import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Start from "./Start";
import Message from "./Message";
import Call from "./Call";
import DataCollection from "./DataCollection";
import { useWidget, WidgetProvider } from "./context/WidgetContext";

const Page = ({ source }) => {
  // Determine if the source is 'voxa.ai' for easier conditional logic
  const isVoxaAiSource = source === "voxa.ai";

  const {
    isOpen,
    setIsOpen,
    activeComponent,
    setActiveComponent,
    contact,
    validationStatus, // Get validation status from context
    widgetConfig,
  } = useWidget();

  const { widgetConfiguration } = widgetConfig || {};

  // Get the theme color from widget configuration
  const themeColor = widgetConfiguration?.appearance?.color || "#111111";

  // Get the position from widget configuration
  const widgetPosition =
    widgetConfiguration?.appearance?.position || "bottom-right";
  const isLeftPosition = widgetPosition === "bottom-left";

  // SVG Components with dynamic fill color
  const DefaultIcon = ({ className, ...props }) => (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="30" cy="30" r="30" fill={themeColor} />
      <path
        d="M38.2305 33.7546C38.6145 33.4176 39.1955 33.4626 39.5255 33.8566C39.8565 34.2516 39.8105 34.8446 39.4255 35.1836C39.2845 35.3076 35.8805 38.2316 29.6395 38.2316C23.4015 38.2316 19.9985 35.3076 19.8555 35.1836C19.4705 34.8446 19.4245 34.2516 19.7555 33.8566C20.0855 33.4636 20.6635 33.4166 21.0485 33.7526L21.0489 33.753C21.1166 33.8096 24.1533 36.3506 29.6395 36.3506C35.2085 36.3506 38.2005 33.7806 38.2305 33.7546Z"
        fill="white"
      />
      <circle cx="24" cy="28" r="2" fill={themeColor} />
      <circle cx="35" cy="28" r="2" fill={themeColor} />
    </svg>
  );

  DefaultIcon.propTypes = {
    className: PropTypes.string,
  };

  const ActiveIcon = ({ className, ...props }) => (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="30" cy="30" r="30" fill={themeColor} />
      <path
        d="M30 37.5938L19.4062 27L21 25.4062L21.7969 26.2031L30 34.4531L39 25.4531L40.5938 27L30 37.5938Z"
        fill="white"
      />
    </svg>
  );

  ActiveIcon.propTypes = {
    className: PropTypes.string,
  };

  const [widgetHeight, setWidgetHeight] = useState("643px");
  const [shouldHidePoweredBy, setShouldHidePoweredBy] = useState(false);

  // If source prop exists, open the widget on initial render
  useEffect(() => {
    if (isVoxaAiSource) {
      setIsOpen(true);
    }
    console.log("is setOpen rerendering");
    // We only want this effect to run once on mount based on the initial source prop,
    // so we disable the exhaustive-deps lint warning for this specific case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Function to update widget dimensions based on viewport
  const updateWidgetDimensions = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const isMobile = window.innerWidth < 768;
    const buttonSize = 62; // 50px icon + margin
    const topMargin = isMobile ? 40 : 50; // Increased top margin to ensure clear visibility
    const bottomSpace = 96; // 6rem (increased from 84px)

    // Calculate available height after accounting for margins
    const availableHeight =
      viewportHeight - topMargin - (isMobile ? buttonSize : bottomSpace);

    // Hide "Powered by Voxa" text if available height is limited
    // More aggressive condition to ensure it hides when space is tight
    const isHeightConstrained = availableHeight < 600; // Increased from 560 to catch more constrained cases
    setShouldHidePoweredBy(isHeightConstrained);

    if (isMobile) {
      // On mobile, ensure there's sufficient margin at top and bottom
      const newHeight = viewportHeight - topMargin - buttonSize;
      setWidgetHeight(`${newHeight}px`);
    } else {
      // On desktop, maintain default height unless viewport is too small
      const defaultHeight = 643;

      if (viewportHeight < defaultHeight + topMargin + bottomSpace) {
        // Increased bottom margin
        const newHeight = viewportHeight - topMargin - bottomSpace;
        setWidgetHeight(`${newHeight}px`);
      } else {
        setWidgetHeight("643px"); // Default height for desktop
      }
    }

    // Log the state for debugging
    console.log(
      "Height constrained:",
      isHeightConstrained,
      "Available height:",
      availableHeight
    );
  }, []);

  // Update dimensions on mount and when window resizes
  useEffect(() => {
    updateWidgetDimensions();
    window.addEventListener("resize", updateWidgetDimensions);

    return () => {
      window.removeEventListener("resize", updateWidgetDimensions);
    };
  }, [updateWidgetDimensions]);

  useEffect(() => {
    console.log("mounting widget");
    return () => {
      console.log("Unmounting widget");
    };
  }, []);

  const renderComponent = useCallback(() => {
    console.log(
      "rerendering renderComponent",
      activeComponent,
      "hidePoweredBy:",
      shouldHidePoweredBy
    );
    // Only show DataCollection if source is not 'voxa.ai' and conditions met
    if (
      activeComponent !== "main" &&
      !contact.collected &&
      !isVoxaAiSource
    ) {
      return (
        <DataCollection
          initialData={contact}
          activeComponent={activeComponent}
          onBack={() => setActiveComponent("main")}
          hidePoweredBy={shouldHidePoweredBy}
        />
      );
    }

    switch (activeComponent) {
      case "message":
        return (
          <Message
            onBack={() => setActiveComponent("main")}
            hidePoweredBy={shouldHidePoweredBy}
          />
        );
      case "call":
        return (
          <Call
            onBack={() => setActiveComponent("main")}
            hidePoweredBy={shouldHidePoweredBy}
          />
        );
      case "main":
      default:
        return (
          <Start
            onCardClick={(component) => setActiveComponent(component)}
            hidePoweredBy={shouldHidePoweredBy}
          />
        );
    }
  }, [activeComponent, shouldHidePoweredBy, contact.collected]);

  // Determine if the main widget container should be rendered
  const shouldRenderWidget = isOpen;

  // Determine if the toggle button should be rendered
  // Only show if not voxa source AND (it's already open OR validation is successful)
  const shouldRenderToggleButton =
    !isVoxaAiSource && (isOpen || validationStatus === "valid");

  // Conditionally set the base classes for the widget container
  const widthClass = isVoxaAiSource ? "w-full" : "w-full md:w-[432px]"; // Dynamic width
  const otherBaseClasses =
    "bg-slate-100 border border-slate-300 rounded-none md:rounded-[18px] shadow-2xl flex flex-col z-40 overflow-hidden";
  const baseContainerClasses = `${widthClass} ${otherBaseClasses}`;
  const positionClass = isVoxaAiSource ? "" : "fixed"; // Add fixed only if source is not 'voxa.ai'
  const containerClasses = `${positionClass} ${baseContainerClasses}`.trim(); // Combine and trim potential leading space

  return (
    <div className="relative h-full">
      {/* Conditionally render the widget container based on isOpen */}
      {shouldRenderWidget && (
        <div
          className={containerClasses} // Use dynamic classes
          style={{
            height: widgetHeight,
            // Only apply positioning styles if it's fixed
            ...(positionClass === "fixed" && {
              ...(isLeftPosition
                ? {
                    left: window.innerWidth < 768 ? "0" : "32px",
                  }
                : {
                    right: window.innerWidth < 768 ? "0" : "32px",
                  }),
              bottom: "96px", // 6rem space for button
            }),
          }}
        >
          <div className="flex flex-col h-full overflow-auto">
            {renderComponent()}
          </div>
        </div>
      )}

      {/* Toggle Button - Conditionally render based on validation and source */}
      {shouldRenderToggleButton && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed bottom-6 ${
            isLeftPosition ? "left-6" : "right-6"
          } z-50 rounded-full shadow-lg transition-all bg-transparent border-none p-0 focus:outline-none focus:ring-0`}
          // No longer need to disable while pending, as button won't show then
          // disabled={isLoading && validationStatus === "pending"}
        >
          {isOpen ? (
            <ActiveIcon />
          ) : (
            // Only need to check for 'valid' here, as shouldRenderToggleButton handles the rest
            validationStatus === "valid" && <DefaultIcon />
          )}
          {/* Loading indicator removed as button is hidden during pending */}
        </button>
      )}
    </div>
  );
};

// Add source prop validation for Page
Page.propTypes = {
  source: PropTypes.string, // source is an optional string
};

const App = ({
  widgetId,
  source,
  agentId,
  initialConfig, // Accept initial props
  initialValidationStatus, // Accept initial props
}) => {
  // Wrap with provider, passing initial props if available
  return (
    <WidgetProvider
      widgetId={widgetId}
      source={source}
      agentId={agentId}
      initialConfig={initialConfig}
      initialValidationStatus={initialValidationStatus}
    >
      <AppContent source={source} />
    </WidgetProvider>
  );
};

// New component to contain logic that needs access to the context
const AppContent = ({ source }) => {
  const { validateAndFetchConfig, validationStatus } = useWidget();

  // Effect to run validation on mount if needed
  useEffect(() => {
    console.log(
      "AppContent mounted. Source:",
      source,
      "Validation Status:",
      validationStatus
    );
    // Only run validation if source is not voxa.ai AND status is still pending
    if (source !== "voxa.ai" && validationStatus === "pending") {
      console.log("Running validation...");
      validateAndFetchConfig();
    } else {
      console.log("Skipping validation on mount.");
    }
    // We want this to run based on initial conditions, disable exhaustive-deps if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, validateAndFetchConfig]); // Add validateAndFetchConfig dependency

  return <Page source={source} />;
};

AppContent.propTypes = {
  source: PropTypes.string,
};

App.propTypes = {
  widgetId: PropTypes.string.isRequired,
  source: PropTypes.string, // Add source prop type, make it optional
  agentId: PropTypes.string,
  initialConfig: PropTypes.object, // Add prop type
  initialValidationStatus: PropTypes.oneOf(["pending", "valid", "invalid"]), // Add prop type
};

export default App;
