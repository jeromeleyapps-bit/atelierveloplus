import { Body, Controller, Post } from "@nestjs/common";
import { HubSpotService } from "./hubspot.service";

@Controller("comms")
export class CommsController {
  constructor(private readonly hubspot: HubSpotService) {}

  // Endpoint générique pour émettre un événement HubSpot (ex: réparation prête, pièces arrivées)
  @Post("hubspot/event")
  async emitEvent(
    @Body() body: { eventName: string; properties?: Record<string, any> },
  ) {
    const { eventName, properties = {} } = body || {};
    return this.hubspot.emitCustomEvent(eventName, properties);
  }

  // Fallback: mise à jour de propriétés contact HubSpot par email
  @Post("hubspot/contact-update")
  async updateContact(
    @Body() body: { email: string; properties: Record<string, any> },
  ) {
    const { email, properties } = body || ({} as any);
    return this.hubspot.updateContactByEmail(email, properties);
  }
}
