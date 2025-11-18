import { Service } from '../types';

// This is a MOCK service. In a real app, you would use the Google Calendar API.

const log = (action: string, details: any) => {
    console.log(`[Google Calendar MOCK] ${action}`, details);
}

export const createCalendarEvent = async (service: Service): Promise<string> => {
    const eventId = `gcal-${Date.now()}`;
    const event = {
        summary: service.title,
        description: `Client: ${service.clientName}\nNotes: ${service.notes || 'N/A'}`,
        start: { dateTime: service.startTime.toISOString() },
        end: { dateTime: (service.endTime || new Date(service.startTime.getTime() + 3600000)).toISOString() }, // Default 1 hr duration
        location: service.pickupAddress,
    };
    log('Creating event', { serviceId: service.id, eventId, event });
    // Simulate API delay
    await new Promise(res => setTimeout(res, 500));
    return eventId;
}

export const updateCalendarEvent = async (eventId: string, service: Service): Promise<void> => {
     const event = {
        summary: service.title,
        description: `Client: ${service.clientName}\nNotes: ${service.notes || 'N/A'}`,
        start: { dateTime: service.startTime.toISOString() },
        end: { dateTime: (service.endTime || new Date(service.startTime.getTime() + 3600000)).toISOString() },
        location: service.pickupAddress,
    };
    log('Updating event', { eventId, event });
    await new Promise(res => setTimeout(res, 500));
}

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
    log('Deleting event', { eventId });
    await new Promise(res => setTimeout(res, 500));
}
