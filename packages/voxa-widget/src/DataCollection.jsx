import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { PhoneInput } from "./components/ui/phone-input";
import { useState, useEffect } from "react";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react";
import { Checkbox } from "./components/ui/checkbox";
import { useWidget } from "./context/WidgetContext";
import PropTypes from "prop-types";

const LOCAL_STORAGE_KEY = "voxaWidgetFormData";

// Helper function to load data from localStorage
const loadFormDataFromLocalStorage = () => {
  try {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Basic validation/check if it's an object
      if (parsedData && typeof parsedData === "object") {
        return parsedData;
      }
    }
  } catch (error) {
    console.error("Error reading formData from localStorage:", error);
  }
  return null; // Return null if nothing found or error occurs
};

// Helper function to get country info from IP
const getCountryFromIP = async () => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (response.ok) {
      const data = await response.json();
      return {
        countryCode: data.country_code,
        countryCallingCode: data.country_calling_code,
      };
    }
  } catch (error) {
    console.error("Error fetching country from IP:", error);
  }
  return null;
};

const DataCollection = ({
  initialData,
  activeComponent,
  onBack,
  hidePoweredBy,
}) => {
  const [formData, setFormData] = useState(() => {
    const savedData = loadFormDataFromLocalStorage();
    // Initialize with defaults, apply initialData, then override with savedData
    return {
      fullName: "",
      email: "",
      phone: "",
      countryCode: "+1", // Default country code
      defaultCountry: "US", // Default country for phone input
      acceptTerms: false,
      ...initialData, // Apply initialData first
      ...savedData, // Override with savedData if present
    };
  });
  const { createContact, isLoading } = useWidget();

  // Auto-detect country from IP on component mount
  useEffect(() => {
    const detectCountry = async () => {
      // Only auto-detect if no saved data exists
      const savedData = loadFormDataFromLocalStorage();
      if (!savedData || !savedData.countryCode) {
        const countryInfo = await getCountryFromIP();
        if (countryInfo) {
          setFormData((prev) => ({
            ...prev,
            countryCode: `+${countryInfo.countryCallingCode}`,
            defaultCountry: countryInfo.countryCode,
          }));
        }
      }
    };

    detectCountry();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createContact(formData);
      // Save data AFTER successful submission
      try {
        const dataToSave = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          countryCode: formData.countryCode || "+1", // Ensure countryCode is saved
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (saveError) {
        console.error("Error saving formData to localStorage:", saveError);
      }
      // Additional logic after successful contact creation can go here
    } catch (error) {
      console.error("Error creating contact:", error);
      // Handle error appropriately
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <>
      <div className="pt-[20px] px-8 pb-[22px] h-full max-h-[140px] rounded-t-[18px] flex flex-col gap-4 leading-8 text-2xl font-semibold -tracking-[0.75px]">
        <span
          className="text-base text-slate-950 leading-6 font-medium gap-2 flex hover:cursor-pointer"
          onClick={onBack}
        >
          <ChevronLeft /> Back
        </span>
        <div className="flex flex-col">
          <p className="text-slate-950">
            {activeComponent === "call"
              ? "Speak with us directly"
              : "Chat with our team instantly"}
          </p>
          <p className="text-slate-400">Get immediate assistance</p>
        </div>
      </div>
      <div className="px-5 py-3 flex flex-col justify-between h-full bg-white rounded-b-[18px]">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-5 font-sans">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Full name"
              value={formData.fullName}
              name="fullName"
              required
              onChange={handleChange}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-5 font-sans">
              Email address <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Email address"
              value={formData.email}
              name="email"
              onChange={handleChange}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-5 font-sans">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              value={formData.phone}
              onChange={(value, data) => {
                setFormData((prev) => ({
                  ...prev,
                  phone: value, // This will include the country code (e.g., +1234567890)
                  countryCode: data
                    ? `+${data.dialCode}`
                    : prev.countryCode || "+1", // Update countryCode, retain previous if data is missing, default to +1
                }));
              }}
              required
              defaultCountry={formData.defaultCountry}
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={formData.acceptTerms}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, acceptTerms: checked })
              }
              className="mt-1 h-4 w-4 bg-white"
              required
            />
            <label htmlFor="terms" className="flex flex-col">
              <p className="text-sm font-medium text-foreground">
                Accept terms and conditions
              </p>
              <p className="text-sm text-muted-foreground">
                You agree to our Terms of Service and Privacy Policy.
              </p>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-sans text-sm leading-6 font-medium"
            disabled={
              !formData.fullName ||
              !formData.email ||
              !formData.phone ||
              !formData.acceptTerms ||
              isLoading
            }
          >
            {isLoading ? (
              "Loading..."
            ) : (
              <>
                {activeComponent === "call" ? (
                  <>
                    <Phone /> Start Call Now
                  </>
                ) : (
                  <>
                    <MessageCircle /> Start Chat Now
                  </>
                )}
              </>
            )}
          </Button>
        </form>
        {!hidePoweredBy && (
          <div className="text-neutral-500 font-inter text-sm leading-4 text-center">
            <a
              href="https://voxa.ai?utm_source=widget"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-600"
            >
              Powered by voxa
            </a>
          </div>
        )}
      </div>
    </>
  );
};

DataCollection.propTypes = {
  initialData: PropTypes.object.isRequired,
  activeComponent: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  hidePoweredBy: PropTypes.bool,
};

export default DataCollection;
