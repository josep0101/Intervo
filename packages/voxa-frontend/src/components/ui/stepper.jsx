export function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center w-full pb-3">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                  index < currentStep
                    ? "bg-green-600 text-white"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <span
                className={`text-xs ${
                  index < currentStep
                    ? "text-green-600"
                    : index === currentStep
                    ? "font-medium text-primary"
                    : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-6 h-px ${
                  index < currentStep ? "bg-primary" : "bg-gray-200"
                }`}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DialogHeader({ title, subtitle, showSeparator = true }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-semibold text-center">{title}</h2>
      <p className="text-center font-sans text-gray-600 text-sm text-muted-foreground">
        {subtitle}
      </p>
      {showSeparator && (
        <div className="w-full h-px bg-gray-200 mb-4 mt-4"></div>
      )}
    </div>
  );
}
