/**
 * Broadcast Mock Data
 * Contains all mock data for broadcast functionality
 */

import type {
  Zone,
  School,
  Subject,
  StaffRole,
  Recipient,
  MessageTemplate,
  BroadcastHistoryEntry,
  BroadcastMessage,
} from "@/types/broadcast";

// Mock zones
export const mockZones: Zone[] = [
  {
    id: "z1",
    name: "Enugu North",
    code: "EN",
    teacherCount: 245,
    schoolCount: 18,
  },
  {
    id: "z2",
    name: "Enugu East",
    code: "EE",
    teacherCount: 312,
    schoolCount: 22,
  },
  {
    id: "z3",
    name: "Enugu South",
    code: "ES",
    teacherCount: 198,
    schoolCount: 15,
  },
  { id: "z4", name: "Nsukka", code: "NS", teacherCount: 423, schoolCount: 35 },
  { id: "z5", name: "Udi", code: "UD", teacherCount: 287, schoolCount: 24 },
  { id: "z6", name: "Awgu", code: "AW", teacherCount: 156, schoolCount: 12 },
  {
    id: "z7",
    name: "Igbo-Etiti",
    code: "IE",
    teacherCount: 178,
    schoolCount: 14,
  },
  {
    id: "z8",
    name: "Oji River",
    code: "OJ",
    teacherCount: 134,
    schoolCount: 10,
  },
];

// Mock schools
export const mockSchools: School[] = [
  {
    id: "s1",
    name: "Unity Primary School",
    zone: "Enugu North",
    zoneId: "z1",
    teacherCount: 15,
    principalName: "Mrs. Adaeze Obi",
    principalEmail: "adaeze.obi@ppsmb.edu.ng",
    principalPhone: "+2348034567890",
  },
  {
    id: "s2",
    name: "Central Secondary School",
    zone: "Enugu East",
    zoneId: "z2",
    teacherCount: 28,
    principalName: "Mr. Chukwuemeka Eze",
    principalEmail: "chukwuemeka.eze@ppsmb.edu.ng",
    principalPhone: "+2348045678901",
  },
  {
    id: "s3",
    name: "Government Girls College",
    zone: "Enugu South",
    zoneId: "z3",
    teacherCount: 32,
    principalName: "Mrs. Ngozi Okwu",
    principalEmail: "ngozi.okwu@ppsmb.edu.ng",
    principalPhone: "+2348056789012",
  },
  {
    id: "s4",
    name: "Model Primary School",
    zone: "Nsukka",
    zoneId: "z4",
    teacherCount: 12,
    principalName: "Mr. Obinna Nwosu",
    principalEmail: "obinna.nwosu@ppsmb.edu.ng",
    principalPhone: "+2348067890123",
  },
  {
    id: "s5",
    name: "Technical College Udi",
    zone: "Udi",
    zoneId: "z5",
    teacherCount: 45,
    principalName: "Mr. Ikechukwu Agu",
    principalEmail: "ikechukwu.agu@ppsmb.edu.ng",
    principalPhone: "+2348078901234",
  },
  {
    id: "s6",
    name: "Community Secondary School Awgu",
    zone: "Awgu",
    zoneId: "z6",
    teacherCount: 18,
    principalName: "Mrs. Amaka Uzoma",
    principalEmail: "amaka.uzoma@ppsmb.edu.ng",
    principalPhone: "+2348089012345",
  },
];

// Mock subjects
export const mockSubjects: Subject[] = [
  { id: "sub1", name: "Mathematics", code: "MATH", teacherCount: 234 },
  { id: "sub2", name: "English Language", code: "ENG", teacherCount: 287 },
  { id: "sub3", name: "Physics", code: "PHY", teacherCount: 145 },
  { id: "sub4", name: "Chemistry", code: "CHE", teacherCount: 132 },
  { id: "sub5", name: "Biology", code: "BIO", teacherCount: 156 },
  { id: "sub6", name: "Computer Science", code: "CS", teacherCount: 89 },
  { id: "sub7", name: "Agricultural Science", code: "AGRIC", teacherCount: 67 },
  { id: "sub8", name: "History", code: "HIST", teacherCount: 78 },
  { id: "sub9", name: "Geography", code: "GEO", teacherCount: 92 },
  { id: "sub10", name: "Economics", code: "ECON", teacherCount: 84 },
];

// Mock roles
export const mockRoles: StaffRole[] = [
  { id: "role1", name: "principal", label: "Principal", count: 150 },
  { id: "role2", name: "vice_principal", label: "Vice Principal", count: 145 },
  {
    id: "role3",
    name: "head_of_department",
    label: "Head of Department",
    count: 320,
  },
  { id: "role4", name: "senior_teacher", label: "Senior Teacher", count: 456 },
  { id: "role5", name: "teacher", label: "Teacher", count: 1234 },
  {
    id: "role6",
    name: "zonal_education_officer",
    label: "Zonal Education Officer",
    count: 8,
  },
];

// Mock recipients for simulation
export const mockRecipients: Recipient[] = [
  {
    id: "r1",
    name: "Mrs. Adaobi Nwankwo",
    email: "adaobi.nwankwo@ppsmb.edu.ng",
    phone: "+2348034567890",
    zone: "Enugu North",
    school: "Unity Primary School",
    role: "teacher",
    subject: "Mathematics",
    tags: ["role:teacher", "zone:enugu-north", "subject:mathematics"],
  },
  {
    id: "r2",
    name: "Mr. Emmanuel Okonkwo",
    email: "emmanuel.okonkwo@ppsmb.edu.ng",
    phone: "+2348045678901",
    zone: "Enugu East",
    school: "Central Secondary School",
    role: "senior_teacher",
    subject: "English Language",
    tags: ["role:senior_teacher", "zone:enugu-east", "subject:english"],
  },
  {
    id: "r3",
    name: "Mrs. Chioma Eze",
    email: "chioma.eze@ppsmb.edu.ng",
    phone: "+2348056789012",
    zone: "Enugu South",
    school: "Government Girls College",
    role: "head_of_department",
    subject: "Physics",
    tags: ["role:head_of_department", "zone:enugu-south", "subject:physics"],
  },
  {
    id: "r4",
    name: "Mr. Chukwuemeka Okoro",
    email: "chukwuemeka.okoro@ppsmb.edu.ng",
    phone: "+2348067890123",
    zone: "Nsukka",
    school: "Model Primary School",
    role: "principal",
    subject: "Biology",
    tags: ["role:principal", "zone:nsukka", "subject:biology"],
  },
  {
    id: "r5",
    name: "Miss Ngozi Okoro",
    email: "ngozi.okoro@ppsmb.edu.ng",
    phone: "+2348078901234",
    zone: "Udi",
    school: "Technical College Udi",
    role: "teacher",
    subject: "Computer Science",
    tags: ["role:teacher", "zone:udi", "subject:computer-science"],
  },
];

// Default message templates
export const defaultTemplates: MessageTemplate[] = [
  {
    id: "tpl1",
    name: "Staff Meeting Notice",
    channel: "email",
    subject: "Important: Staff Meeting Notice",
    body: `Dear Staff,

This is to inform you that a mandatory staff meeting has been scheduled.

Date: [DATE]
Time: [TIME]
Venue: [VENUE]

Your attendance is compulsory.

Best regards,
Management`,
    tags: ["meeting", "official"],
    createdAt: new Date(),
    usageCount: 24,
  },
  {
    id: "tpl2",
    name: "Urgent SMS Alert",
    channel: "sms",
    body: "PPSMB ALERT: [MESSAGE]. For enquiries, call [PHONE].",
    tags: ["urgent", "alert"],
    createdAt: new Date(),
    usageCount: 56,
  },
  {
    id: "tpl3",
    name: "Training Workshop Invitation",
    channel: "email",
    subject: "Invitation: Professional Development Workshop",
    body: `Dear Colleague,

You are cordially invited to attend a Professional Development Workshop.

Topic: [TOPIC]
Date: [DATE]
Time: [TIME]
Venue: [VENUE]

Please confirm your attendance by [DEADLINE].

Warm regards,
Training Department`,
    tags: ["training", "workshop"],
    createdAt: new Date(),
    usageCount: 12,
  },
];

// Default broadcast history for fallback
export const defaultBroadcastHistory: BroadcastHistoryEntry[] = [
  {
    id: "hist1",
    channel: "email",
    subject: "Annual Teacher Census Report Reminder",
    previewText:
      "Please submit your annual census report by the deadline...",
    recipientCount: 1234,
    filterType: "global",
    filterLabel: "All Teachers",
    isInternal: false,
    status: "sent" as BroadcastMessage["status"],
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    sentBy: "Chairman Office",
    deliveryStats: { total: 1234, sent: 1230, failed: 4, pending: 0 },
  },
  {
    id: "hist2",
    channel: "sms",
    previewText: "URGENT: All principals are required to attend...",
    recipientCount: 150,
    filterType: "role",
    filterLabel: "All Principals",
    isInternal: false,
    status: "sent" as BroadcastMessage["status"],
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    sentBy: "Secretary",
    deliveryStats: { total: 150, sent: 148, failed: 2, pending: 0 },
  },
  {
    id: "hist3",
    channel: "email",
    subject: "Internal Memo: Budget Review Meeting",
    previewText: "This is to notify all HQ staff about the upcoming...",
    recipientCount: 25,
    filterType: "headquarters",
    filterLabel: "Main Headquarters",
    isInternal: true,
    status: "sent" as BroadcastMessage["status"],
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    sentBy: "PRO",
    deliveryStats: { total: 25, sent: 25, failed: 0, pending: 0 },
  },
];
