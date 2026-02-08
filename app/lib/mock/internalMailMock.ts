/**
 * Internal Mail Mock Data
 * Contains all mock data for internal mail functionality
 */

import type { InternalUnit, InternalUser, InternalMail } from "@/types/mail";

// Mock departments
export const mockDepartments: InternalUnit[] = [
  { id: "dept-hq-main", name: "Main Headquarters", type: "headquarters" },
  { id: "dept-hr", name: "Human Resources", type: "headquarters" },
  { id: "dept-it", name: "IT Department", type: "headquarters" },
  { id: "dept-accounts", name: "Accounts & Finance", type: "headquarters" },
  { id: "dept-exams", name: "Exams & Records", type: "headquarters" },
  { id: "zone-en", name: "Enugu North Zone", type: "zone" },
  { id: "zone-ee", name: "Enugu East Zone", type: "zone" },
  { id: "zone-es", name: "Enugu South Zone", type: "zone" },
  { id: "zone-ns", name: "Nsukka Zone", type: "zone" },
  { id: "zone-ud", name: "Udi Zone", type: "zone" },
  { id: "zone-aw", name: "Awgu Zone", type: "zone" },
];

// Mock personnel
export const mockPersonnel: InternalUser[] = [
  {
    id: "u1",
    name: "Prof. J. Eze",
    email: "chairman@ppsmb.edu.ng",
    role: "Chairman",
    departmentId: "dept-hq-main",
    departmentName: "Main Headquarters",
  },
  {
    id: "u2",
    name: "Dr. (Mrs) A. Okoro",
    email: "secretary@ppsmb.edu.ng",
    role: "Secretary",
    departmentId: "dept-hq-main",
    departmentName: "Main Headquarters",
  },
  {
    id: "u3",
    name: "Mrs. C. Obi",
    email: "hr.director@ppsmb.edu.ng",
    role: "Director HR",
    departmentId: "dept-hr",
    departmentName: "Human Resources",
  },
  {
    id: "u4",
    name: "Mr. B. Amadi",
    email: "amadi.b@ppsmb.edu.ng",
    role: "Senior Admin Officer",
    departmentId: "dept-hr",
    departmentName: "Human Resources",
  },
  {
    id: "u5",
    name: "Engr. D. Okeke",
    email: "it.head@ppsmb.edu.ng",
    role: "Head of IT",
    departmentId: "dept-it",
    departmentName: "IT Department",
  },
  {
    id: "u6",
    name: "Miss F. Nweke",
    email: "support@ppsmb.edu.ng",
    role: "System Admin",
    departmentId: "dept-it",
    departmentName: "IT Department",
  },
];

// Initial mails for fallback
export const initialMails: InternalMail[] = [
  {
    id: "ML001",
    folder: "inbox",
    from: {
      name: "Ministry of Education",
      email: "ministry@ed.gov.ng",
      avatar: "",
    },
    to: ["ppsmb@ed.gov.ng"],
    subject: "Annual Teacher Census Report Request",
    preview:
      "Please submit the annual teacher census report for all zones by January 31st, 2026. This report should include...",
    body: `Dear PPSMB Director...`,
    date: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
    isStarred: true,
    hasAttachment: true,
    attachments: [{ name: "Report_Template.xlsx", size: "245 KB", link: "" }],
    priority: "high",
    tags: ["urgent", "report"],
  },
];
