/**
 * HubSpot Integration for Communications
 * Emails and SMS via HubSpot API
 */

import { Client } from '@hubspot/api-client';

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
  }>;
}

export interface SendSMSOptions {
  to: string;
  content: string;
  from?: string;
}

/**
 * Send email via HubSpot
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    // HubSpot Transactional Email API
    const response = await hubspotClient.apiRequest({
      method: 'POST',
      path: '/marketing/v3/transactional/single-send/send',
      body: {
        emailId: parseInt(process.env.HUBSPOT_EMAIL_ID || '0'),
        message: {
          to: options.to,
          from: options.from || process.env.HUBSPOT_FROM_EMAIL,
          replyTo: options.replyTo,
          subject: options.subject,
          html: options.htmlContent,
          text: options.textContent
        }
      }
    });

    return {
      success: true,
      messageId: response.id,
      data: response
    };
  } catch (error: any) {
    console.error('HubSpot email error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send SMS via HubSpot
 */
export async function sendSMS(options: SendSMSOptions) {
  try {
    // HubSpot SMS API (via Conversations)
    const response = await hubspotClient.apiRequest({
      method: 'POST',
      path: '/conversations/v3/conversations/sms',
      body: {
        phoneNumber: options.to,
        message: options.content,
        fromNumber: options.from || process.env.HUBSPOT_FROM_PHONE
      }
    });

    return {
      success: true,
      messageId: response.id,
      data: response
    };
  } catch (error: any) {
    console.error('HubSpot SMS error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}

/**
 * Create or update contact in HubSpot
 */
export async function upsertContact(data: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  properties?: Record<string, any>;
}) {
  try {
    const properties: Record<string, any> = {
      ...(data.email && { email: data.email }),
      ...(data.phone && { phone: data.phone }),
      ...(data.firstName && { firstname: data.firstName }),
      ...(data.lastName && { lastname: data.lastName }),
      ...data.properties
    };

    // Try to find existing contact
    let contactId: string | null = null;
    
    if (data.email) {
      try {
        const existing = await hubspotClient.crm.contacts.basicApi.getById(data.email, undefined, undefined, undefined, false, 'email');
        contactId = existing.id;
      } catch (e) {
        // Contact doesn't exist
      }
    }

    if (contactId) {
      // Update existing
      const response = await hubspotClient.crm.contacts.basicApi.update(contactId, { properties });
      return { success: true, contactId: response.id, created: false };
    } else {
      // Create new
      const response = await hubspotClient.crm.contacts.basicApi.create({ properties });
      return { success: true, contactId: response.id, created: true };
    }
  } catch (error: any) {
    console.error('HubSpot contact error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upsert contact'
    };
  }
}

/**
 * Test HubSpot connection
 */
export async function testConnection() {
  try {
    const response = await hubspotClient.apiRequest({
      method: 'GET',
      path: '/account-info/v3/api-usage/daily'
    });
    
    return {
      success: true,
      message: 'HubSpot connection successful',
      data: response
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed'
    };
  }
}
