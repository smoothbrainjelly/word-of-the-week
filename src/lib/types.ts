export type Settings = {
  promptTheme: string;
  day: string;
  time: string;
  timezone: string;
};

export type Recipient = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

export type HistoryEntry = {
  id: string;
  word: string;
  definition: string;
  etymology: string;
  example: string;
  sentAt: string;
  recipientCount: number;
};
