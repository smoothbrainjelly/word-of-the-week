export type WordResult = {
  word: string;
  pronunciation: string;
  simple_pronunciation: string;
  part_of_speech: string;
  definition: string;
  etymology: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
};

export type Settings = {
  promptTheme: string;
  day: string;
  time: string;
  timezone: string;
};

export type HistoryEntry = {
  id: string;
  word: string;
  pronunciation: string;
  simple_pronunciation: string;
  part_of_speech: string;
  definition: string;
  etymology: string;
  example: string;
  synonyms?: string[];
  antonyms?: string[];
  sentAt: string;
  recipientCount: number;
};

export type PaginatedHistory = {
  entries: HistoryEntry[];
  total: number;
  totalPages: number;
  page: number;
};
