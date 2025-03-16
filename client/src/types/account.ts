export interface DiscordAccount {
  id: string;
  userId: string;
  name: string;
  status: 'online' | 'offline' | 'connecting' | 'error';
  token: string;
  isActive: boolean;
  friendCount: number;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface AccountStatus {
  status: string;
  uptime: number;
  friendCount: number;
}

export interface StatusHistoryEntry {
  timestamp: string;
  status: string;
}

export interface CreateAccountRequest {
  name: string;
  token: string;
}

export interface UpdateAccountRequest {
  name?: string;
  token?: string;
  isActive?: boolean;
}
