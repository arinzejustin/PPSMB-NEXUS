/**
 * Communication & Broadcasting Hub Types
 * Types for the tag-based recipient targeting system
 */

export type BroadcastChannel = "email" | "sms";

export type RecipientFilterType =
  | "individual"
  | "global"
  | "zone"
  | "school"
  | "role"
  | "subject"
  | "headquarters";

export interface RecipientTag {
  type: string;
  value: string;
  label: string;
}

export interface RecipientFilter {
  type: RecipientFilterType;
  value: string | null;
  label: string;
  tags: RecipientTag[];
}

// Individual recipient
export interface Recipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  zone?: string;
  school?: string;
  role?: string;
  subject?: string;
  tags: string[];
}

// File attachment
export interface BroadcastAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  file?: File;
}

// SMS Smart Link - auto-hosted file with shortened URL
export interface SmartLink {
  originalUrl: string;
  shortUrl: string;
  fileName?: string;
  expiresAt?: Date;
}

// Email content structure
export interface EmailContent {
  subject: string;
  body: string;
  attachments: BroadcastAttachment[];
  inlineImages: string[];
}

// SMS content structure
export interface SmsContent {
  body: string;
  smartLinks: SmartLink[];
  characterCount: number;
  segmentCount: number;
}

// Broadcast message
export interface BroadcastMessage {
  id?: string;
  channel: BroadcastChannel;
  recipientFilter: RecipientFilter;
  recipientCount: number;
  recipients: Recipient[];
  emailContent?: EmailContent;
  smsContent?: SmsContent;
  isInternal: boolean;
  isDraft: boolean;
  scheduledAt?: Date;
  createdAt: Date;
  createdBy: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed" | "partial";
  deliveryStats?: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
  // Index signature for DBRecord compatibility
  [key: string]: unknown;
}

// Draft message for saving
export interface BroadcastDraft {
  id?: string;
  channel: BroadcastChannel;
  recipientFilter: RecipientFilter;
  recipientCount: number;
  recipients: Recipient[];
  emailContent?: EmailContent;
  smsContent?: SmsContent;
  isInternal: boolean;
  isDraft: boolean;
  scheduledAt?: Date;
  createdAt: Date;
  createdBy: string;
  lastModified: Date;
  // Index signature for DBRecord compatibility
  [key: string]:
    | BroadcastChannel
    | RecipientFilter
    | number
    | Recipient[]
    | EmailContent
    | SmsContent
    | boolean
    | Date
    | string
    | undefined;
}

// Zone data for filtering
export interface Zone {
  id: string;
  name: string;
  code: string;
  teacherCount: number;
  schoolCount: number;
}

// School data for filtering
export interface School {
  id: string;
  name: string;
  zone: string;
  zoneId: string;
  teacherCount: number;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
}

// Subject data for filtering
export interface Subject {
  id: string;
  name: string;
  code: string;
  teacherCount: number;
}

// Role types
export interface StaffRole {
  id: string;
  name: string;
  label: string;
  count: number;
}

// Headquarters types
export type HeadquartersType = "zonal" | "main";

export interface HeadquartersInfo {
  type: HeadquartersType;
  label: string;
  description: string;
}

// Message template
export interface MessageTemplate {
  id: string;
  name: string;
  channel: BroadcastChannel;
  subject?: string;
  body: string;
  tags: readonly string[];
  createdAt: Date;
  usageCount: number;
  // Index signature for DBRecord compatibility
  [key: string]: unknown;
}

// Broadcast history entry
export interface BroadcastHistoryEntry {
  id: string;
  channel: BroadcastChannel;
  subject?: string;
  previewText: string;
  recipientCount: number;
  filterType: RecipientFilterType;
  filterLabel: string;
  isInternal: boolean;
  status: BroadcastMessage["status"];
  sentAt: Date;
  sentBy: string;
  deliveryStats: BroadcastMessage["deliveryStats"];
  failedRecipients?: ReadonlyArray<{
    readonly name?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly reason?: string;
  }>;
  [key: string]: unknown;
}

export interface RecipientCountResponse {
  count: number;
  breakdown?: {
    byZone?: Record<string, number>;
    byRole?: Record<string, number>;
    bySubject?: Record<string, number>;
  };
}

export interface SendBroadcastResponse {
  success: boolean;
  messageId: string;
  recipientCount: number;
  estimatedDeliveryTime?: string;
  errors?: string[];
}

export const SMS_CHAR_LIMIT = 160;
export const SMS_UNICODE_CHAR_LIMIT = 70;
export const SMS_CONCATENATED_LIMIT = 153;
export const SMS_UNICODE_CONCATENATED_LIMIT = 67;

// Calculate SMS segments
export function calculateSmsSegments(text: string): {
  characters: number;
  segments: number;
  isUnicode: boolean;
} {
  const isUnicode = /[^\x00-\x7F]/.test(text);
  const length = text.length;

  if (length === 0) return { characters: 0, segments: 0, isUnicode };

  if (isUnicode) {
    if (length <= SMS_UNICODE_CHAR_LIMIT) {
      return { characters: length, segments: 1, isUnicode };
    }
    return {
      characters: length,
      segments: Math.ceil(length / SMS_UNICODE_CONCATENATED_LIMIT),
      isUnicode,
    };
  }

  if (length <= SMS_CHAR_LIMIT) {
    return { characters: length, segments: 1, isUnicode };
  }
  return {
    characters: length,
    segments: Math.ceil(length / SMS_CONCATENATED_LIMIT),
    isUnicode,
  };
}

export interface BroadcastState {
  // Current message being composed
  currentMessage: BroadcastMessage | null;

  // Drafts
  drafts: BroadcastDraft[];

  // History
  history: BroadcastHistoryEntry[];

  // Reference data
  zones: Zone[];
  schools: School[];
  subjects: Subject[];
  roles: StaffRole[];
  templates: MessageTemplate[];

  // UI state
  isSending: boolean;
  isLoading: boolean;
  error: string | null;
}
