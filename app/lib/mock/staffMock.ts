/**
 * Staff Mock Data
 * Contains all mock data for staff/teacher management
 */

export interface MockTeacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  gender: string;
  dateOfBirth: string;
  zone: string;
  school: string;
  qualification: string;
  subject: string;
  yearsOfService: number;
  employmentDate: string;
  certStatus: "active" | "expiring" | "expired" | "pending";
  certExpiry: string | null;
  lastTransfer: string | null;
  status: string;
}

// Mock teacher data
export const mockTeachers: MockTeacher[] = [
  {
    id: "TCH001",
    name: "Mrs. Adaobi Nwankwo",
    email: "adaobi.nwankwo@ppsmb.edu.ng",
    phone: "+234 803 456 7890",
    avatar: "",
    gender: "Female",
    dateOfBirth: "1985-03-15",
    zone: "Enugu North",
    school: "Government Secondary School, Enugu",
    qualification: "M.Ed",
    subject: "Mathematics",
    yearsOfService: 12,
    employmentDate: "2014-01-15",
    certStatus: "active",
    certExpiry: "2027-06-30",
    lastTransfer: "2022-08-01",
    status: "active",
  },
  {
    id: "TCH002",
    name: "Mr. Emmanuel Okonkwo",
    email: "emmanuel.okonkwo@ppsmb.edu.ng",
    phone: "+234 805 234 5678",
    avatar: "",
    gender: "Male",
    dateOfBirth: "1980-07-22",
    zone: "Nsukka",
    school: "Community Secondary School, Nsukka",
    qualification: "B.Ed",
    subject: "English Language",
    yearsOfService: 15,
    employmentDate: "2011-03-20",
    certStatus: "expiring",
    certExpiry: "2026-02-28",
    lastTransfer: "2019-01-10",
    status: "active",
  },
  {
    id: "TCH003",
    name: "Mrs. Chioma Eze",
    email: "chioma.eze@ppsmb.edu.ng",
    phone: "+234 807 890 1234",
    avatar: "",
    gender: "Female",
    dateOfBirth: "1990-11-08",
    zone: "Enugu South",
    school: "Girls Secondary School, Trans-Ekulu",
    qualification: "NCE",
    subject: "Biology",
    yearsOfService: 6,
    employmentDate: "2020-02-10",
    certStatus: "active",
    certExpiry: "2028-12-31",
    lastTransfer: null,
    status: "active",
  },
  {
    id: "TCH004",
    name: "Mr. Ikechukwu Ugwu",
    email: "ikechukwu.ugwu@ppsmb.edu.ng",
    phone: "+234 809 567 8901",
    avatar: "",
    gender: "Male",
    dateOfBirth: "1978-05-30",
    zone: "Udi",
    school: "Technical College, Udi",
    qualification: "B.Sc + PGDE",
    subject: "Physics",
    yearsOfService: 18,
    employmentDate: "2008-09-01",
    certStatus: "expired",
    certExpiry: "2025-06-30",
    lastTransfer: "2015-03-15",
    status: "active",
  },
  {
    id: "TCH005",
    name: "Miss Ngozi Okoro",
    email: "ngozi.okoro@ppsmb.edu.ng",
    phone: "+234 802 345 6789",
    avatar: "",
    gender: "Female",
    dateOfBirth: "1995-01-20",
    zone: "Awgu",
    school: "Secondary School, Awgu",
    qualification: "B.Ed",
    subject: "Chemistry",
    yearsOfService: 3,
    employmentDate: "2023-01-05",
    certStatus: "pending",
    certExpiry: null,
    lastTransfer: null,
    status: "active",
  },
  {
    id: "TCH006",
    name: "Mr. Obiora Nnamdi",
    email: "obiora.nnamdi@ppsmb.edu.ng",
    phone: "+234 806 789 0123",
    avatar: "",
    gender: "Male",
    dateOfBirth: "1982-09-12",
    zone: "Enugu East",
    school: "Model Secondary School, Nike",
    qualification: "M.Sc + PGDE",
    subject: "Computer Science",
    yearsOfService: 10,
    employmentDate: "2016-04-18",
    certStatus: "active",
    certExpiry: "2027-08-15",
    lastTransfer: "2021-06-01",
    status: "active",
  },
  {
    id: "TCH007",
    name: "Mrs. Amaka Obi",
    email: "amaka.obi@ppsmb.edu.ng",
    phone: "+234 808 901 2345",
    avatar: "",
    gender: "Female",
    dateOfBirth: "1988-12-05",
    zone: "Enugu North",
    school: "Federal Government College, Enugu",
    qualification: "Ph.D",
    subject: "Economics",
    yearsOfService: 8,
    employmentDate: "2018-02-12",
    certStatus: "active",
    certExpiry: "2029-04-20",
    lastTransfer: "2023-01-10",
    status: "active",
  },
  {
    id: "TCH008",
    name: "Mr. Chukwuemeka Ani",
    email: "chukwuemeka.ani@ppsmb.edu.ng",
    phone: "+234 804 567 8901",
    avatar: "",
    gender: "Male",
    dateOfBirth: "1975-04-18",
    zone: "Nsukka",
    school: "Urban Secondary School, Nsukka",
    qualification: "M.Ed",
    subject: "History",
    yearsOfService: 22,
    employmentDate: "2004-08-01",
    certStatus: "expiring",
    certExpiry: "2026-03-15",
    lastTransfer: "2012-09-01",
    status: "active",
  },
];

// Filter options
export const zones = [
  "Enugu North",
  "Enugu South",
  "Enugu East",
  "Nsukka",
  "Udi",
  "Awgu",
];

export const qualifications = [
  "B.Ed",
  "M.Ed",
  "NCE",
  "B.Sc/B.A + PGDE",
  "M.Sc/M.A + PGDE",
  "Ph.D",
];

export const certStatuses = [
  {
    value: "active",
    label: "Active",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "expiring",
    label: "Expiring Soon",
    color: "bg-amber-100 text-amber-700",
  },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-700" },
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-700" },
];

export const transferSchools = [
  "Government Secondary School, Nsukka",
  "Community Secondary School, Udi",
  "Girls Secondary School, Trans-Ekulu",
  "Technical College, Awgu",
  "Model Secondary School, Nike",
];
