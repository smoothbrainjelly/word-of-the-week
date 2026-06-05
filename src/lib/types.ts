export type Settings = {
  promptTheme: string;
  day: string;
  time: string;
  timezone: string;
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

export type PaginatedHistory = {
  entries: HistoryEntry[];
  total: number;
  totalPages: number;
  page: number;
};
