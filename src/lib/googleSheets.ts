/**
 * Nhealth Teams - Google Apps Script Integration
 *
 * Provides a global SCRIPT_URL constant and standardized fetch() methods
 * using method="POST" and headers={"Content-Type": "text/plain;charset=utf-8"}
 * to bypass browser CORS preflight restrictions when sending data to Google Sheets.
 */

import { SCRIPT_URL as CONFIG_SCRIPT_URL } from '../config.js';

// 1. Define global constant SCRIPT_URL from config.js with env override capability
export const SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
  import.meta.env.VITE_TEAMS_SCRIPT_URL ||
  CONFIG_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzxBUXaA36PldpKByV2JS3P2DabaA-blsP_Ry4Q4zgepfOCn3PIMaUgYYd7hcJ29GAv5w/exec';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * 2. Send payload to Google Apps Script Web App
 */
export async function postToGoogleSheets<T = any>(payload: Record<string, any>): Promise<ApiResponse<T>> {
  if (!SCRIPT_URL || SCRIPT_URL.includes('placeholder')) {
    // Graceful fallback for local development or when webhook URL is not set
    console.info('[GoogleSheets] SCRIPT_URL is placeholder or unconfigured. Payload:', payload);
    return { success: true, message: 'Processed locally (SCRIPT_URL not configured)' };
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Crucial: prevents CORS preflight errors with Google Apps Script
      },
      body: JSON.stringify({
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const resJson = await response.json().catch(() => ({ status: 'success' }));
    return {
      success: true,
      message: resJson.message || 'Data successfully synced to Google Sheets.',
      data: resJson
    };
  } catch (error: any) {
    console.error('[GoogleSheets Error]', error);
    return {
      success: false,
      message: error?.message || 'Failed to connect to Google Sheets.'
    };
  }
}

/**
 * Sync Employee Credentials (Create / Update / Status Change)
 */
export async function syncEmployeeToGoogleSheets(employee: {
  id: string;
  fullName: string;
  username: string;
  role: string;
  department: string;
  status: string;
  password?: string;
}) {
  return postToGoogleSheets({
    action: 'sync_employee',
    ...employee
  });
}

/**
 * Employee Login & Activity Logging
 */
export async function logTeamsActivityToGoogleSheets(activity: {
  employeeId: string;
  employeeName: string;
  activityType: 'LOGIN' | 'REGISTRATION' | 'DATA_ENTRY' | 'APPROVAL' | 'LOGOUT';
  details: string;
}) {
  return postToGoogleSheets({
    action: 'log_activity',
    ...activity
  });
}

/**
 * Verify Employee Credentials directly against Google Sheets (Optional verification)
 */
export async function verifyEmployeeInGoogleSheets(credentials: {
  username: string;
  password?: string;
}) {
  return postToGoogleSheets({
    action: 'verify_employee',
    ...credentials
  });
}
