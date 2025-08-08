import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea } from "./scroll-area";
import { cn } from "../../lib/utils";

const PhoneInput = React.forwardRef(
  ({ className, onChange, ...props }, ref) => {
    return (
      <>
        <RPNInput.default
          ref={ref}
          className={cn("flex", className)}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          smartCaret={false}
          /**
           * Handles the onChange event.
           *
           * react-phone-number-input might trigger the onChange event as undefined
           * when a valid phone number is not entered. To prevent this,
           * the value is coerced to an empty string.
           *
           * @param {E164Number | undefined} value - The entered value
           */
          onChange={(value) => onChange?.(value || "")}
          {...props}
        />
        <div id="phone-input-popover-portal-target" />
      </>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef(({ className, ...props }, ref) => (
  <Input
    className={cn("rounded-e-lg rounded-s-none h-10", className)}
    {...props}
    ref={ref}
  />
));
InputComponent.displayName = "InputComponent";

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}) => {
  const triggerRef = React.useRef(null);
  const [portalContainer, setPortalContainer] = React.useState(null);

  React.useEffect(() => {
    if (triggerRef.current) {
      console.log("[PhoneInput] Trigger ref available:", triggerRef.current);
      const rootNode = triggerRef.current.getRootNode();
      console.log("[PhoneInput] Root node found:", rootNode);
      if (rootNode instanceof ShadowRoot) {
        const targetContainer = rootNode.querySelector(
          "#phone-input-popover-portal-target"
        );
        if (targetContainer) {
          console.log(
            "[PhoneInput] Setting portal container to target div inside Shadow DOM:",
            targetContainer
          );
          setPortalContainer(targetContainer);
        } else {
          console.error(
            "[PhoneInput] Portal target div (#phone-input-popover-portal-target) not found within shadow root. Falling back to host.",
            rootNode
          );
          setPortalContainer(rootNode.host);
        }
      } else {
        console.error(
          "[PhoneInput] Root node is not a ShadowRoot. Falling back to document.body. Root node:",
          rootNode
        );
        setPortalContainer(document.body);
      }
    } else {
      console.warn("[PhoneInput] Trigger ref not yet available on mount.");
    }
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="flex gap-1 rounded-e-none h-10 rounded-s-lg border-r-0 px-3 focus:z-10"
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "-mr-2 size-4 opacity-50",
              disabled ? "hidden" : "opacity-100"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent container={portalContainer} className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <ScrollArea className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                    />
                  ) : null
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
}) => {
  return (
    <CommandItem className="gap-2" onSelect={() => onChange(country)}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(
        country
      )}`}</span>
      <CheckIcon
        className={`ml-auto size-4 ${
          country === selectedCountry ? "opacity-100" : "opacity-0"
        }`}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export { PhoneInput };
