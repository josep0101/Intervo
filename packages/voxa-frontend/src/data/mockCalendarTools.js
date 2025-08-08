export const mockCalendarTools = [
  {
    id: "calendly-scheduler-1",
    name: "Calendly Scheduler",
    type: "calendly",
    description: "Schedule meetings and appointments using Calendly",
    serverPort: 8000,
    category: "calendar",
    requiredFields: [
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Enter your Calendly API key",
        required: true,
      },
    ],
  },
  {
    id: "google-calendar-1",
    name: "Google Calendar",
    type: "google-calendar",
    description: "Manage events and schedules with Google Calendar",
    serverPort: 8001,
    category: "calendar",
    requiredFields: [
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Enter your Google Calendar API key",
        required: true,
      },
    ],
  },
  {
    id: "outlook-calendar-1",
    name: "Microsoft Outlook Calendar",
    type: "outlook-calendar",
    description: "Schedule and manage events with Microsoft Outlook",
    serverPort: 8002,
    category: "calendar",
    requiredFields: [
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Enter your Microsoft Outlook API key",
        required: true,
      },
    ],
  },
  {
    id: "apple-calendar-1",
    name: "Apple Calendar",
    type: "apple-calendar",
    description: "Sync and manage events with Apple Calendar",
    serverPort: 8003,
    category: "calendar",
    requiredFields: [
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "Enter your Apple Calendar API key",
        required: true,
      },
    ],
  },
];
