export type InternalUnitType = "headquarters" | "zone";

export interface InternalUnit {
  id: string;
  name: string;
  type: InternalUnitType;
  parentId?: string; // For zones belonging to HQ? Or sub-units.
}

export interface InternalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  departmentId: string;
  departmentName: string;
}

// Union type for the selection dropdown (Person or Department)
export type MailRecipientType = "user" | "department";

export interface MailRecipient {
  id: string;
  type: MailRecipientType;
  label: string;
  avatar?: string;
  email?: string; // If available, mainly for display
  description?: string; // e.g. "Head of IT" or "All Staff in IT"
  data?: InternalUser | InternalUnit;
}

export interface MailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  url?: string;
}

export interface InternalMessage {
  id?: string;
  subject: string;
  body: string; // HTML content from rich text
  from: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  to: MailRecipient[];
  attachments: MailAttachment[];
  createdAt: Date;
  isDraft: boolean;
  status: "sent" | "draft" | "failed";
}

export interface InternalMail {
  _id?: string;
  id: string;
  folder: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  to: string[];
  subject: string;
  preview: string;
  body: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  attachments: {
    name: string;
    size: string;
    link: string;
  }[];
  priority: string;
  tags: string[];
  [key: string]: any;
}
