export interface Auth {
  isAuthenticated: boolean;
  token: string | null;
  expiresAt: number | null;
  hasSetPin: boolean;
  pin: string | null;
}

export interface UserDetails {
  name: string;
  email: string;
  department: string;
  role: string;
  lastLogin: number;
  deviceId: string;
  devices: string[];
}

