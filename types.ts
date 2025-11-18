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
  AIRPORT_TRANSFER = 'AIRPORT_TRANSFER',
  CITY_TOUR = 'CITY_TOUR',
  HOTEL_TRANSFER = 'HOTEL_TRANSFER',
  WINE_TOUR = 'WINE_TOUR',
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
  pickupAddress: string;
  dropoffAddress: string;
  startTime: Date;
  endTime?: Date;
  clientName: string;
  clientPrice?: number;
  paymentMethod?: string;
  supplierCost?: number;
  notes?: string; // Storing notes as string, can be JSON stringified
  status: ServiceStatus;
  serviceType: ServiceType;
  driverId?: string;
  supplierId?: string;
  createdById: string;
  numberOfPassengers?: number;
  clientPaymentStatus?: PaymentStatus;
  supplierPaymentStatus?: PaymentStatus;
  googleCalendarEventId?: string;
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

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface ExtractedReservation {
  clientName?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupTime?: string; // ISO string format
  serviceType?: ServiceType;
  numberOfPassengers?: number;
  specialRequests?: string;
  title?: string;
  clientPrice?: number;
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
  primaryColor: string; // e.g., 'blue', 'indigo', 'purple', 'green'
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}
