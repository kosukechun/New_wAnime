import type {
  Category,
  WorkStatus,
  ScheduleKind,
  OfferType,
} from "@/generated/prisma/client";
export type ExternalId = { source: string; externalId: string };
export type PersonRecord = {
  source: string;
  externalId: string;
  name: string;
  nativeName?: string | null;
  aliases?: string[];
  kind: string;
  photoUrl?: string | null;
  biography?: string | null;
  birthday?: string | null;
  sourceUrl: string;
  role: string;
  characterImage?: string | null;
};
export type ScheduleRecord = {
  source: string;
  externalId: string;
  kind: ScheduleKind;
  region: string;
  date: string;
  time?: string | null;
  instant?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  isPremiere: boolean;
  broadcaster?: string | null;
  label?: string | null;
  sourceUrl: string;
};
export type OfferRecord = {
  platformId: string;
  name: string;
  logoUrl?: string | null;
  region: string;
  type: OfferType;
  startDate?: string | null;
  watchUrl?: string | null;
  availabilityUrl?: string | null;
  exclusive?: boolean | null;
  early?: boolean | null;
  sourceUrl: string;
};
export type WorkRecord = {
  source: string;
  externalId: string;
  crossIds?: ExternalId[];
  title: string;
  englishTitle?: string | null;
  originalTitle?: string | null;
  aliases: string[];
  synopsis?: string | null;
  posterUrl?: string | null;
  originalWorkTitle?: string | null;
  category: Category;
  status: WorkStatus;
  worldPremiere?: string | null;
  jpPremiere?: string | null;
  announcedAt?: string | null;
  endDate?: string | null;
  declaredYear?: number | null;
  declaredMonth?: number | null;
  seasonYear?: number | null;
  season?: string | null;
  sourceMedium?: string | null;
  installment?: string | null;
  episodeCount?: number | null;
  runtimeMinutes?: number | null;
  officialUrl?: string | null;
  officialX?: string | null;
  trailerUrl?: string | null;
  popularity?: number;
  sourceUrl: string;
  confidence?: string;
  genres: string[];
  companies: string[];
  metadata?: Record<string, string | string[] | number | null>;
  schedules?: ScheduleRecord[];
  schedulesComplete?: boolean;
  offers?: OfferRecord[];
  people?: PersonRecord[];
};
