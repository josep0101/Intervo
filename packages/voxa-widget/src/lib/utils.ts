import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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
