export interface Auth {
  isAuthenticated: boolean;
  token: string | null;
  hasSetPin: boolean;
  pin?: string;
}

export interface UserDetails {
  name: string;
  email: string;
  department: string;
  role: string;
  lastLogin: number;
  deviceId: string;
  devices: string[];
  uuid: string;
}
