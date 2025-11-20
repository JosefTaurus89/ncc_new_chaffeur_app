
// FIX: Centralize the 'View' type to be used across the application for consistency.
export type View = 'calendar' | 'drivers' | 'suppliers' | 'financials' | 'settings';

export enum ServiceStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceType {
  TRANSFER = 'TRANSFER',
  TRANSFER_WITH_STOP = 'TRANSFER_WITH_STOP',
  TOUR = 'TOUR',
  CUSTOM = 'CUSTOM',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
}

export interface Service {
  id: string;
  title: string;
  flightNumber?: string; // New field
  pickupAddress: string;
  stopAddress?: string; // New field for Waypoint/Stop
  dropoffAddress: string;
  startTime: Date;
  endTime?: Date;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientPrice?: number;
  deposit?: number; // Added for tracking upfront payments
  paymentMethod?: string;
  supplierCost?: number;
  extrasAmount?: number; // NEW: Extra commission value
  extrasInfo?: string;   // NEW: Description for extra commission
  notes?: string; // Storing notes as string, can be JSON stringified
  status: ServiceStatus;
  serviceType: ServiceType;
  driverId?: string;
  supplierId?: string;
  createdById: string;
  numberOfPassengers?: number; // Kept for legacy/total calculation
  passengersAdults?: number;   // New
  passengersKids?: number;     // New
  clientPaymentStatus?: PaymentStatus;
  supplierPaymentStatus?: PaymentStatus;
  googleCalendarEventId?: string;
  color?: string; // Custom color override
}

export type DriverAvailability = 'Available' | 'Busy' | 'On Leave';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'DRIVER' | 'PARTNER';
  availability: DriverAvailability;
  photoUrl?: string;
}

export interface DriverLeave {
  id: string;
  driverId: string;
  date: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface ExtractedReservation {
  title?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  flightNumber?: string;
  pickupAddress?: string;
  stopAddress?: string;
  dropoffAddress?: string;
  pickupTime?: string; // ISO string format
  serviceType?: ServiceType;
  numberOfPassengers?: number;
  passengersAdults?: number;
  passengersKids?: number;
  specialRequests?: string;
  clientPrice?: number;
  paymentMethod?: string;
}

export interface FilterCriteria {
  serviceType?: ServiceType[];
  status?: ServiceStatus[];
  driverId?: string[];
}

export interface SavedFilter {
  id: string;
  name: string;
  criteria: FilterCriteria;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  primaryColor: string; // e.g., 'blue', 'indigo', 'purple', 'green', 'red', 'orange', etc.
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fontStyle: 'inter' | 'roboto' | 'serif';
  defaultView: View;
  defaultServiceDuration: number; // in minutes
  autoSyncGoogleCalendar: boolean;
  
  // New Settings
  language: 'en' | 'it' | 'es' | 'fr';
  currency: string;
  timeFormat: '12h' | '24h';
  calendarStartHour: number; // 0-23
  calendarEndHour: number; // 0-23
  compactMode: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  accessToken?: string;
}
