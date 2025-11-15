import type { CalendarClient } from "@flao/core";
import { google } from "googleapis";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  url?: string;
}

export class MockCalendarClient implements CalendarClient {
  private clientId?: string;
  private clientSecret?: string;
  private refreshToken?: string;
  private oauth2Client?: ReturnType<typeof google.auth.OAuth2>;

  constructor(clientId?: string, clientSecret?: string, refreshToken?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;

    if (clientId && clientSecret) {
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "urn:ietf:wg:oauth:2.0:oob" // Redirect URI for installed apps
      );

      if (refreshToken) {
        this.oauth2Client.setCredentials({
          refresh_token: refreshToken,
        });
      }
    }
  }

  private async getCalendarClient() {
    if (!this.oauth2Client) {
      throw new Error("Google Calendar OAuth2 client not initialized");
    }

    // Refresh token if needed
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error("[Calendar] Error refreshing token:", error);
      throw new Error("Failed to refresh Google Calendar access token");
    }

    return google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  async scheduleEvent(
    title: string,
    startTime: Date,
    endTime: Date,
    attendees: string[] = []
  ): Promise<CalendarEvent> {
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
    } catch (error) {
      console.error("[Calendar] Error scheduling event:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("[Calendar] Falling back to mock data");
        return this.getMockEvent(title, startTime, endTime, attendees);
      }
      throw error;
    }
  }

  async findAvailableSlot(durationMinutes: number, attendees: string[]): Promise<Date | null> {
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
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const freebusyResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: now.toISOString(),
          timeMax: future.toISOString(),
          items: attendees.map((email) => ({ id: email })),
        },
      });

      const calendars = freebusyResponse.data.calendars || {};
      const busySlots: Array<{ start: string; end: string }> = [];

      // Collect all busy slots
      Object.values(calendars).forEach((calendar) => {
        if (calendar.busy) {
          // Filter out slots with missing start/end times
          const validBusySlots = calendar.busy.filter(
            (slot) => slot.start && slot.end
          ) as Array<{ start: string; end: string }>;
          busySlots.push(...validBusySlots);
        }
      });

      // Sort busy slots by start time
      busySlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      // Find first available slot
      let currentTime = now;
      const durationMs = durationMinutes * 60 * 1000;

      for (const busySlot of busySlots) {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);

        // If there's a gap before this busy slot
        if (currentTime.getTime() + durationMs <= busyStart.getTime()) {
          return currentTime;
        }

        // Move current time to after this busy slot
        if (busyEnd.getTime() > currentTime.getTime()) {
          currentTime = busyEnd;
        }
      }

      // If we haven't found a slot, try after the last busy slot
      if (currentTime.getTime() + durationMs <= future.getTime()) {
        return currentTime;
      }

      return null;
    } catch (error) {
      console.error("[Calendar] Error finding available slot:", error);
      if (process.env.NODE_ENV === "development") {
        console.warn("[Calendar] Falling back to mock data");
        return this.getMockAvailableSlot();
      }
      throw error;
    }
  }

  private getMockEvent(
    title: string,
    startTime: Date,
    endTime: Date,
    attendees: string[]
  ): CalendarEvent {
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

  private getMockAvailableSlot(): Date {
    const now = new Date();
    return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  }
}

