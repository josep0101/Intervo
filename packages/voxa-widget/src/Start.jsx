import { Mail, MessageCircle, Phone, Smartphone } from "lucide-react";
import PropTypes from "prop-types";
import { useWidget } from "./context/WidgetContext";

const Main = ({ onCardClick, hidePoweredBy = false }) => {
  const { widgetConfig } = useWidget();
  const { widgetConfiguration } = widgetConfig;

  // Destructure and handle widget configuration with fallbacks
  const startingMessage =
    widgetConfiguration?.behavior?.startingMessage || "How can we help?";

  // Show features if undefined or true, hide only if explicitly false
  const showVoiceCall =
    widgetConfiguration?.behavior?.features?.aiVoiceCall !== false;
  const showChat = widgetConfiguration?.behavior?.features?.aiChat !== false;

  // Contact method configuration
  const contactMethodEnabled =
    widgetConfiguration?.contactMethod?.enabled === true;
  const contactMethodType = widgetConfiguration?.contactMethod?.type || "email";
  const contactMethodValue = widgetConfiguration?.contactMethod?.value || "";

  // Helper function to get contact method details
  const getContactMethodDetails = () => {
    switch (contactMethodType) {
      case "whatsapp":
        return {
          icon: MessageCircle,
          text: "Message us on WhatsApp",
          subtext: "Quick response via WhatsApp",
          href: `https://wa.me/${contactMethodValue.replace(/[^0-9]/g, "")}`,
        };
      case "phone":
        return {
          icon: Phone,
          text: "Call us",
          subtext: "Speak directly with our team",
          href: `tel:${contactMethodValue}`,
        };
      case "sms":
        return {
          icon: Smartphone,
          text: "Text us",
          subtext: "Send us a text message",
          href: `sms:${contactMethodValue}`,
        };
      case "email":
      default:
        return {
          icon: Mail,
          text: "Send us an email",
          subtext: "Our team will get back to you in a few hours!",
          href: `mailto:${contactMethodValue}`,
        };
    }
  };

  const contactDetails = getContactMethodDetails();
  const ContactIcon = contactDetails.icon;

  return (
    <>
      <div className="pt-[30px] px-8 pb-[22px] h-full max-h-[110px] rounded-t-[18px] flex flex-col leading-8 text-2xl font-semibold -tracking-[0.75px]">
        <p className="text-slate-950 flex gap-2">Hi there</p>
        <p className="text-slate-400">{startingMessage}</p>
      </div>
      <div className="px-5 py-3 flex flex-col justify-between h-full">
        <div className="flex flex-col gap-3">
          {/* cards */}
          {showVoiceCall && (
            <div
              className="bg-white hover:cursor-pointer transition-all duration-300 border border-black/[.14] hover:border-black/[.24] focus:border-black/[.8] flex py-[22px] px-6 rounded-[10px] items-center gap-[22px] shadow-md hover:shadow-sm"
              onClick={() => onCardClick("call")}
            >
              <Phone className="h-6 w-6" />
              <div className="flex flex-col gap-[6px]">
                <p className="text-black font-semibold text-base leading-[22.4px]">
                  Talk to us now
                </p>
                <p className="text-neutral-500 font-inter text-[15px] leading-[18px]">
                  Live web call with our AI agent
                </p>
              </div>
            </div>
          )}

          {showChat && (
            <div
              className="bg-white hover:cursor-pointer transition-all duration-300 border border-black/[.14] hover:border-black/[.24] focus:border-black/[.8] flex py-[22px] px-6 rounded-[10px] items-center gap-[22px] shadow-md hover:shadow-sm"
              onClick={() => onCardClick("message")}
            >
              <MessageCircle className="h-6 w-6" />
              <div className="flex flex-col gap-[6px]">
                <p className="text-black font-semibold text-base leading-[22.4px]">
                  Send a message
                </p>
                <p className="text-neutral-500 font-inter text-[15px] leading-[18px]">
                  AI typically reply in a few seconds
                </p>
              </div>
            </div>
          )}

          {contactMethodEnabled && (
            <a
              href={contactDetails.href}
              className="bg-white hover:cursor-pointer transition-all duration-300 border border-black/[.14] hover:border-black/[.24] focus:border-black/[.8] flex py-[22px] px-6 rounded-[10px] items-center gap-[22px] shadow-md hover:shadow-sm no-underline text-inherit"
            >
              <ContactIcon className="h-6 w-6" />
              <div className="flex flex-col gap-[6px]">
                <p className="text-black font-semibold text-base leading-[22.4px]">
                  {contactDetails.text}
                </p>
                <p className="text-neutral-500 font-inter text-[15px] leading-[18px]">
                  {contactDetails.subtext}
                </p>
              </div>
            </a>
          )}
        </div>
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

Main.propTypes = {
  onCardClick: PropTypes.func.isRequired,
  hidePoweredBy: PropTypes.bool,
};

export default Main;
