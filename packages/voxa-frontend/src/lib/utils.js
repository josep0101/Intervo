import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Currency Conversion Utilities ---
/**
 * Convert credits to USD dollars
 * @param {number} credits - Amount in credits
 * @returns {string} Formatted USD amount with 2 decimal places
 */
export const creditsToUSD = (credits) => {
  return (credits / 100).toFixed(2); // 100 credits = $1.00
};

/**
 * Convert USD dollars to credits
 * @param {number} usd - Amount in USD dollars
 * @returns {number} Amount in credits (integer)
 */
export const usdToCredits = (usd) => {
  return Math.round(usd * 100); // $1.00 = 100 credits
};

/**
 * Format credits as USD currency
 * @param {number} credits - Amount in credits
 * @returns {string} Formatted as USD (e.g., "$10.00")
 */
export const formatCreditsAsUSD = (credits) => {
  if (credits === undefined || credits === null) return "$0.00";
  const usdAmount = parseFloat(creditsToUSD(credits));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usdAmount);
};
// --- End Currency Conversion ---

export const getDateAndTime = (str) => {
  let date_ = new Date(str);

  let date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date_);

  let time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date_);
  return { date, time };
};

export const dateInYYYYMMDD = (date) => {
  if (!date) return "";
  const newdate = new Date(date);
  const year = newdate.getFullYear();
  const month = String(newdate.getMonth() + 1).padStart(2, "0");
  const day = String(newdate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

//Since backend now takes care of this - all this is redundant.

export const transformAgentData = (agent, existingConversationId = null) => {
  const transformedConfig = {
    leadPrompt: agent.prompt,
    sttService: agent.sttSettings?.service,
    ttsService: agent.ttsSettings?.service,
    introduction: agent.introduction,
    phoneNumber: agent.phoneNumber,
    activityId: agent.activityId,
    conversationId: existingConversationId || uuidv4(),
  };

  return transformedConfig;
};
