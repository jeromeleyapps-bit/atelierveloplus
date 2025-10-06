import axios from "axios";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class HubSpotService {
  private readonly logger = new Logger(HubSpotService.name);
  private readonly baseUrl = "https://api.hubapi.com";
  private readonly token = process.env.HUBSPOT_PRIVATE_APP_TOKEN || "";
  private readonly appId = process.env.HUBSPOT_APP_ID || "";

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async emitCustomEvent(eventName: string, properties: Record<string, any>) {
    // Minimal placeholder using Custom Behavioral Events (requires app with events)
    // If not configured, we no-op but log for traceability
    if (!this.token || !this.appId) {
      this.logger.warn(`HubSpot not configured. Skip event ${eventName}`);
      return { skipped: true };
    }
    try {
      const url = `${this.baseUrl}/events/v3/send`; // for custom behavioral events
      const payload = {
        eventName,
        properties,
      };
      const { data } = await axios.post(url, payload, {
        headers: this.headers,
      });
      return data;
    } catch (err: any) {
      this.logger.error(
        `HubSpot event error: ${eventName}`,
        err?.response?.data || err?.message,
      );
      return { error: true };
    }
  }

  async createTimelineEvent(
    objectType: "contacts" | "deals",
    objectId: string | number,
    eventTemplateId: number,
    tokens: Record<string, string>,
  ) {
    // Alternative: Timeline API for custom events
    if (!this.token) {
      this.logger.warn("HubSpot not configured. Skip timeline event");
      return { skipped: true };
    }
    try {
      const url = `${this.baseUrl}/crm/v3/timeline/events`;
      const payload = {
        id: `${Date.now()}-${Math.random()}`,
        eventTemplateId,
        tokens,
        objectId,
        objectType,
      } as any;
      const { data } = await axios.post(url, payload, {
        headers: this.headers,
      });
      return data;
    } catch (err: any) {
      this.logger.error(
        "HubSpot timeline error",
        err?.response?.data || err?.message,
      );
      return { error: true };
    }
  }

  async updateContactByEmail(email: string, properties: Record<string, any>) {
    if (!this.token) {
      this.logger.warn("HubSpot not configured. Skip contact update");
      return { skipped: true };
    }
    try {
      // 1) Get contact by email
      const searchUrl = `${this.baseUrl}/crm/v3/objects/contacts/search`;
      const searchPayload = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        properties: ["email"],
        limit: 1,
      };
      const search = await axios.post(searchUrl, searchPayload, {
        headers: this.headers,
      });
      const id = search.data?.results?.[0]?.id;
      if (!id) {
        this.logger.warn(`HubSpot contact not found for email ${email}`);
        return { notFound: true };
      }
      // 2) Update properties
      const updateUrl = `${this.baseUrl}/crm/v3/objects/contacts/${id}`;
      const { data } = await axios.patch(
        updateUrl,
        { properties },
        { headers: this.headers },
      );
      return data;
    } catch (err: any) {
      this.logger.error(
        "HubSpot contact update error",
        err?.response?.data || err?.message,
      );
      return { error: true };
    }
  }
}
