import { google } from "googleapis";
export class MockCalendarClient {
    clientId;
    clientSecret;
    refreshToken;
    oauth2Client;
    constructor(clientId, clientSecret, refreshToken) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
        if (clientId && clientSecret) {
            this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "urn:ietf:wg:oauth:2.0:oob");
            if (refreshToken) {
                this.oauth2Client.setCredentials({
                    refresh_token: refreshToken,
                });
            }
        }
    }
    async getCalendarClient() {
        if (!this.oauth2Client) {
            throw new Error("Google Calendar OAuth2 client not initialized");
        }
        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
        }
        catch (error) {
            console.error("[Calendar] Error refreshing token:", error);
            throw new Error("Failed to refresh Google Calendar access token");
        }
        return google.calendar({ version: "v3", auth: this.oauth2Client });
    }
    async scheduleEvent(title, startTime, endTime, attendees = []) {
        if (!this.clientId || !this.clientSecret || !this.refreshToken) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[Calendar] No credentials, using mock data");
                return this.getMockEvent(title, startTime, endTime, attendees);
            }
            throw new Error("Google Calendar credentials are required");
        }
        try {
            const calendar = await this.getCalendarClient();
            const event = {
                summary: title,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: "UTC",
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: "UTC",
                },
                attendees: attendees.map((email) => ({ email })),
            };
            const response = await calendar.events.insert({
                calendarId: "primary",
                requestBody: event,
            });
            const createdEvent = response.data;
            if (!createdEvent.id) {
                throw new Error("Failed to create calendar event");
            }
            return {
                id: createdEvent.id,
                title: createdEvent.summary || title,
                startTime,
                endTime,
                attendees,
                url: createdEvent.htmlLink || undefined,
            };
        }
        catch (error) {
            console.error("[Calendar] Error scheduling event:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[Calendar] Falling back to mock data");
                return this.getMockEvent(title, startTime, endTime, attendees);
            }
            throw error;
        }
    }
    async findAvailableSlot(durationMinutes, attendees) {
        if (!this.clientId || !this.clientSecret || !this.refreshToken) {
            if (process.env.NODE_ENV === "development") {
                console.warn("[Calendar] No credentials, using mock data");
                return this.getMockAvailableSlot();
            }
            throw new Error("Google Calendar credentials are required");
        }
        try {
            const calendar = await this.getCalendarClient();
            const now = new Date();
            const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const freebusyResponse = await calendar.freebusy.query({
                requestBody: {
                    timeMin: now.toISOString(),
                    timeMax: future.toISOString(),
                    items: attendees.map((email) => ({ id: email })),
                },
            });
            const calendars = freebusyResponse.data.calendars || {};
            const busySlots = [];
            Object.values(calendars).forEach((calendar) => {
                if (calendar.busy) {
                    const validBusySlots = calendar.busy.filter((slot) => slot.start && slot.end);
                    busySlots.push(...validBusySlots);
                }
            });
            busySlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            let currentTime = now;
            const durationMs = durationMinutes * 60 * 1000;
            for (const busySlot of busySlots) {
                const busyStart = new Date(busySlot.start);
                const busyEnd = new Date(busySlot.end);
                if (currentTime.getTime() + durationMs <= busyStart.getTime()) {
                    return currentTime;
                }
                if (busyEnd.getTime() > currentTime.getTime()) {
                    currentTime = busyEnd;
                }
            }
            if (currentTime.getTime() + durationMs <= future.getTime()) {
                return currentTime;
            }
            return null;
        }
        catch (error) {
            console.error("[Calendar] Error finding available slot:", error);
            if (process.env.NODE_ENV === "development") {
                console.warn("[Calendar] Falling back to mock data");
                return this.getMockAvailableSlot();
            }
            throw error;
        }
    }
    getMockEvent(title, startTime, endTime, attendees) {
        console.log(`[Mock Calendar] Scheduling event: ${title}`);
        console.log(`  Start: ${startTime.toISOString()}`);
        console.log(`  End: ${endTime.toISOString()}`);
        if (attendees.length > 0) {
            console.log(`  Attendees: ${attendees.join(", ")}`);
        }
        return {
            id: `cal-${Math.random().toString(36).substring(7)}`,
            title,
            startTime,
            endTime,
            attendees,
            url: `https://calendar.google.com/event?eid=${Math.random().toString(36)}`,
        };
    }
    getMockAvailableSlot() {
        const now = new Date();
        return new Date(now.getTime() + 2 * 60 * 60 * 1000);
    }
}
//# sourceMappingURL=calendar-client.js.map