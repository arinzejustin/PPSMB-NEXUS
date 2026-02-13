/**
 * Staff Mock Data
 * Contains all mock data for staff/teacher management
 */

export interface BankRecord {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  dateAdded: string;
  isCurrent: boolean;
}

export interface TransferRecord {
  id: string;
  fromSchool: string;
  fromZone: string;
  toSchool: string;
  toZone: string;
  reason: string;
  transferDate: string;
  approvedBy: string;
  status: "completed" | "pending" | "rejected";
}

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
  gradeLevel: string;
  yearsOfService: number;
  employmentDate: string;
  retirementDate: string;
  serviceStatus: "active" | "retiring-soon" | "retired" | "on-leave";
  lastTransfer: string | null;
  status: string;
  bankRecords: BankRecord[];
  transferHistory: TransferRecord[];
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
    gradeLevel: "GL 12",
    yearsOfService: 12,
    employmentDate: "2014-01-15",
    retirementDate: "2045-03-15",
    serviceStatus: "active",
    lastTransfer: "2022-08-01",
    status: "active",
    bankRecords: [
      {
        id: "BK001",
        bankName: "First Bank of Nigeria",
        accountNumber: "2034567890",
        accountName: "Adaobi Nwankwo",
        dateAdded: "2020-05-10",
        isCurrent: true,
      },
      {
        id: "BK002",
        bankName: "UBA",
        accountNumber: "1023456789",
        accountName: "Adaobi Nwankwo",
        dateAdded: "2014-01-15",
        isCurrent: false,
      },
    ],
    transferHistory: [
      {
        id: "TR001",
        fromSchool: "Community Secondary School, Nsukka",
        fromZone: "Nsukka",
        toSchool: "Government Secondary School, Enugu",
        toZone: "Enugu North",
        reason: "Spousal relocation",
        transferDate: "2022-08-01",
        approvedBy: "Director PPSMB",
        status: "completed",
      },
      {
        id: "TR002",
        fromSchool: "Girls Secondary School, Trans-Ekulu",
        fromZone: "Enugu South",
        toSchool: "Community Secondary School, Nsukka",
        toZone: "Nsukka",
        reason: "Zone rebalancing",
        transferDate: "2018-01-15",
        approvedBy: "Director PPSMB",
        status: "completed",
      },
    ],
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
    gradeLevel: "GL 14",
    yearsOfService: 15,
    employmentDate: "2011-03-20",
    retirementDate: "2040-07-22",
    serviceStatus: "active",
    lastTransfer: "2019-01-10",
    status: "active",
    bankRecords: [
      {
        id: "BK003",
        bankName: "Zenith Bank",
        accountNumber: "1045678901",
        accountName: "Emmanuel Okonkwo",
        dateAdded: "2019-06-20",
        isCurrent: true,
      },
    ],
    transferHistory: [
      {
        id: "TR003",
        fromSchool: "Technical College, Udi",
        fromZone: "Udi",
        toSchool: "Community Secondary School, Nsukka",
        toZone: "Nsukka",
        reason: "Promotion posting",
        transferDate: "2019-01-10",
        approvedBy: "Director PPSMB",
        status: "completed",
      },
    ],
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
    gradeLevel: "GL 08",
    yearsOfService: 6,
    employmentDate: "2020-02-10",
    retirementDate: "2050-11-08",
    serviceStatus: "active",
    lastTransfer: null,
    status: "active",
    bankRecords: [
      {
        id: "BK004",
        bankName: "Access Bank",
        accountNumber: "0567890123",
        accountName: "Chioma Eze",
        dateAdded: "2020-02-10",
        isCurrent: true,
      },
    ],
    transferHistory: [],
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
    gradeLevel: "GL 15",
    yearsOfService: 18,
    employmentDate: "2008-09-01",
    retirementDate: "2038-05-30",
    serviceStatus: "active",
    lastTransfer: "2015-03-15",
    status: "active",
    bankRecords: [
      {
        id: "BK005",
        bankName: "GTBank",
        accountNumber: "0234567890",
        accountName: "Ikechukwu Ugwu",
        dateAdded: "2015-08-20",
        isCurrent: true,
      },
      {
        id: "BK006",
        bankName: "Sterling Bank",
        accountNumber: "0011234567",
        accountName: "Ikechukwu Ugwu",
        dateAdded: "2008-09-01",
        isCurrent: false,
      },
    ],
    transferHistory: [
      {
        id: "TR004",
        fromSchool: "Model Secondary School, Nike",
        fromZone: "Enugu East",
        toSchool: "Technical College, Udi",
        toZone: "Udi",
        reason: "Subject area need",
        transferDate: "2015-03-15",
        approvedBy: "Director PPSMB",
        status: "completed",
      },
    ],
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
    gradeLevel: "GL 07",
    yearsOfService: 3,
    employmentDate: "2023-01-05",
    retirementDate: "2055-01-20",
    serviceStatus: "active",
    lastTransfer: null,
    status: "active",
    bankRecords: [
      {
        id: "BK007",
        bankName: "Fidelity Bank",
        accountNumber: "5012345678",
        accountName: "Ngozi Okoro",
        dateAdded: "2023-01-05",
        isCurrent: true,
      },
    ],
    transferHistory: [],
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
    gradeLevel: "GL 13",
    yearsOfService: 10,
    employmentDate: "2016-04-18",
    retirementDate: "2042-09-12",
    serviceStatus: "active",
    lastTransfer: "2021-06-01",
    status: "active",
    bankRecords: [
      {
        id: "BK008",
        bankName: "Polaris Bank",
        accountNumber: "1078901234",
        accountName: "Obiora Nnamdi",
        dateAdded: "2021-07-01",
        isCurrent: true,
      },
    ],
    transferHistory: [
      {
        id: "TR005",
        fromSchool: "Secondary School, Awgu",
        fromZone: "Awgu",
        toSchool: "Model Secondary School, Nike",
        toZone: "Enugu East",
        reason: "ICT deployment initiative",
        transferDate: "2021-06-01",
        approvedBy: "Director PPSMB",
        status: "completed",
      },
    ],
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
    gradeLevel: "GL 16",
    yearsOfService: 8,
    employmentDate: "2018-02-12",
    retirementDate: "2048-12-05",
    serviceStatus: "active",
    lastTransfer: "2023-01-10",
    status: "active",
    bankRecords: [
      {
        id: "BK009",
        bankName: "UBA",
        accountNumber: "2098765432",
        accountName: "Amaka Obi",
        dateAdded: "2018-02-12",
        isCurrent: true,
      },
    ],
    transferHistory: [
      {
        id: "TR006",
        fromSchool: "Government Secondary School, Enugu",
        fromZone: "Enugu North",
        toSchool: "Federal Government College, Enugu",
        toZone: "Enugu North",
        reason: "Intra-zone posting",
        transferDate: "2023-01-10",
        approvedBy: "Zonal Director",
        status: "completed",
      },
    ],
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
    gradeLevel: "GL 16",
    yearsOfService: 22,
    employmentDate: "2004-08-01",
    retirementDate: "2035-04-18",
    serviceStatus: "retiring-soon",
    lastTransfer: "2012-09-01",
    status: "active",
    bankRecords: [
      {
        id: "BK010",
        bankName: "First Bank of Nigeria",
        accountNumber: "3012345678",
        accountName: "Chukwuemeka Ani",
        dateAdded: "2004-08-01",
        isCurrent: true,
      },
    ],
    transferHistory: [
      {
        id: "TR007",
        fromSchool: "Government Secondary School, Enugu",
        fromZone: "Enugu North",
        toSchool: "Urban Secondary School, Nsukka",
        toZone: "Nsukka",
        reason: "Hometown posting request",
        transferDate: "2012-09-01",
        approvedBy: "Director PPSMB",
        status: "completed",
      },
    ],
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

export const serviceStatuses = [
  {
    value: "active",
    label: "Active",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    value: "retiring-soon",
    label: "Retiring Soon",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    value: "retired",
    label: "Retired",
    color:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  },
  {
    value: "on-leave",
    label: "On Leave",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
];

// Keep old export for backward compat
export const certStatuses = serviceStatuses;

export const transferSchools = [
  "Government Secondary School, Nsukka",
  "Community Secondary School, Udi",
  "Girls Secondary School, Trans-Ekulu",
  "Technical College, Awgu",
  "Model Secondary School, Nike",
];

export const nigerianBanks = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "Globus Bank",
  "Guaranty Trust Bank",
  "Heritage Banking Company",
  "Keystone Bank",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
];
