export type ActionResponse<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  rollNumber: string;
  qrCodePath?: string | null;
  sportsExperience: string[];
  createdAt: Date;
  updatedAt: Date;
  role: string;
}


export interface Sport {
  id: string;
  name: string;
  numberOfCourts: number;
  courtsInUse: number;
  courtData?: any;
  maxCapacity?: number | null;
  numPlayers?: number | null;
  createdAt: Date;
  updatedAt: Date;
  equipments: Equipment[];
}

export interface Equipment {
  id: string;
  name: string;
  total: number;
  inUse: number;
  sportId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingEquipment {
  id: string;
  bookingId: string;
  equipmentId: string;
  count: number;
  equipment?: Equipment;
}

export interface Booking {
  id: string;
  userId: string;
  sportId?: string | null;
  courtId?: string | null;
  sportName: string;
  numberOfPlayers: number;
  startTime: string;
  endTime: string;
  date: string;
  qrDetail?: string | null;
  status: string;
  endDate?: string | null;
  courtNo?: string | null;
  scanned: boolean;
  createdAt: Date;
  updatedAt: Date;
  equipments?: BookingEquipment[];
}

export interface Match {
  id: string;
  sportId?: string | null;
  sportName: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuideApplication {
  id: string;
  email: string;
  option: string;
  sportId?: string | null;
  sportName: string;
  level?: string | null;
  resolved: boolean;
  time?: string | null;
  description?: string | null;
  avDays?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invite {
  id: string;
  sportId?: string | null;
  sport: string;
  venue: string;
  date: string;
  time: string;
  email: string;
  name: string;
  mobileNumber: string;
  show: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GymLog {
  id: string;
  userId: string;
  entryTime: Date;
  exitTime?: Date | null;
  duration?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentCounts {
  [key: string]: number;
}

export interface RateLimitResult {
  success: boolean,
  limit: number,
  remaining: number,
  reset: number
}

export interface CreateBookingInput {
  userId: string;
  sportName: string;
  equipmentsIssued?: string[];
  numberOfPlayers?: string | number;
  startTime: string;
  endTime: string;
  date: string;
  qrdetail?: string;
  status: string;
  enddate?: string | null;
  CourtNo?: string | null;
}

export interface UpdateBookingInput extends Partial<CreateBookingInput> {
  scanned?: boolean;
}
