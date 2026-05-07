export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type UserRole = 'admin' | 'jury' | 'participant';
export type UserStatus = 'pending' | 'active' | 'locked';
export type RegistrationStatus = 'pending' | 'confirmed' | 'deactivated';
export type CompetitionType = 'battle' | 'seminar';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  competitionType: CompetitionType;
  status: RegistrationStatus;
  createdAt: string;
}

export interface Score {
  id: string;
  participantId: string;
  juryId: string;
  juryName: string;
  scoreValues: Record<string, number>;
  totalScore: number;
  updatedAt: string;
}

export interface EventState {
  id: string;
  competitionType: CompetitionType;
  winnerId: string | null;
  announced: boolean;
}
