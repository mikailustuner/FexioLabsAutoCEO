import type { CalendarClient } from "@flao/core";
export interface CalendarEvent {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    url?: string;
}
export declare class MockCalendarClient implements CalendarClient {
    private clientId?;
    private clientSecret?;
    private refreshToken?;
    private oauth2Client?;
    constructor(clientId?: string, clientSecret?: string, refreshToken?: string);
    private getCalendarClient;
    scheduleEvent(title: string, startTime: Date, endTime: Date, attendees?: string[]): Promise<CalendarEvent>;
    findAvailableSlot(durationMinutes: number, attendees: string[]): Promise<Date | null>;
    private getMockEvent;
    private getMockAvailableSlot;
}
//# sourceMappingURL=calendar-client.d.ts.map