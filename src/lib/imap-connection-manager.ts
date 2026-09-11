/**
 * IMAP Connection Manager
 * Handles automatic reconnection with exponential backoff
 * Prevents rapid-fire login attempts that Gmail flags as DDoS/bot attacks
 */

import Imap from 'imap';

export interface ImapConnectionConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions: Record<string, any>;
  connTimeout: number;
  authTimeout: number;
}

export class ImapConnectionManager {
  private config: ImapConnectionConfig;
  private imap: Imap | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 5000; // 5 seconds
  private maxReconnectDelay = 60000; // 60 seconds
  private onReadyCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;
  private onCloseCallback?: () => void;

  constructor(config: ImapConnectionConfig) {
    this.config = config;
  }

  /**
   * Calculate exponential backoff delay
   * 5s, 10s, 20s, 40s, etc., capped at 60s
   */
  private getReconnectDelay(): number {
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    return Math.min(delay, this.maxReconnectDelay);
  }

  /**
   * Connect to IMAP server with error handling
   */
  public connect(
    onReady?: () => void,
    onError?: (error: Error) => void,
    onClose?: () => void
  ): void {
    if (this.isConnecting) {
      console.log('[IMAP Manager] Connection already in progress, skipping...');
      return;
    }

    this.onReadyCallback = onReady;
    this.onErrorCallback = onError;
    this.onCloseCallback = onClose;

    this.isConnecting = true;
    console.log('[IMAP Manager] Initiating connection...');

    try {
      this.imap = new Imap(this.config);

      this.imap.once('ready', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('✅ [IMAP Manager] Connected successfully');
        if (this.onReadyCallback) this.onReadyCallback();
      });

      this.imap.on('error', (err: Error) => {
        this.isConnecting = false;
        const errorMessage = err.message || String(err);
        console.error('[IMAP Manager] IMAP Error:', errorMessage);

        // Detect specific error types
        if (errorMessage.includes('AUTHENTICATIONFAILED') || errorMessage.includes('authentication failed')) {
          console.error('[IMAP Manager] 🔴 AUTHENTICATION FAILED');
          console.error('[IMAP Manager] → Check CASHAPP_EMAIL environment variable');
          console.error('[IMAP Manager] → Check CASHAPP_EMAIL_PASSWORD (use app-specific password, not your main Gmail password)');
          console.error('[IMAP Manager] → Gmail may be blocking login attempts - check your Gmail Security settings');
        } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
          console.error('[IMAP Manager] 🔴 DNS RESOLUTION FAILED');
          console.error('[IMAP Manager] → Check CASHAPP_IMAP_HOST environment variable');
        } else if (errorMessage.includes('ECONNREFUSED')) {
          console.error('[IMAP Manager] 🔴 CONNECTION REFUSED');
          console.error('[IMAP Manager] → Check CASHAPP_IMAP_PORT environment variable');
        } else if (errorMessage.includes('TIMEOUT') || errorMessage.includes('timeout')) {
          console.error('[IMAP Manager] 🔴 CONNECTION TIMEOUT');
          console.error('[IMAP Manager] → Server may be unresponsive or network issue');
        } else if (errorMessage.includes('SELF_SIGNED_CERT') || errorMessage.includes('certificate')) {
          console.error('[IMAP Manager] 🔴 CERTIFICATE ERROR');
          console.error('[IMAP Manager] → TLS configuration issue');
        }

        if (this.onErrorCallback) this.onErrorCallback(err);
        this.scheduleReconnect();
      });

      this.imap.on('end', () => {
        console.log('[IMAP Manager] Connection ended');
      });

      this.imap.on('close', (hadError: boolean) => {
        console.log(`[IMAP Manager] Connection closed (Error state: ${hadError})`);
        this.isConnecting = false;
        if (this.onCloseCallback) this.onCloseCallback();
        this.scheduleReconnect();
      });

      this.imap.connect();
    } catch (error) {
      this.isConnecting = false;
      console.error('[IMAP Manager] Failed to initialize connection:', error);
      if (this.onErrorCallback) this.onErrorCallback(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[IMAP Manager] 🔴 Max reconnection attempts reached. Giving up.');
      return;
    }

    this.clearReconnectTimeout();

    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;

    console.log(
      `[IMAP Manager] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.onReadyCallback, this.onErrorCallback, this.onCloseCallback);
    }, delay);
  }

  /**
   * Get current IMAP instance
   */
  public getConnection(): Imap | null {
    return this.imap;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.imap !== null && !this.isConnecting;
  }

  /**
   * Manually close connection
   */
  public close(): void {
    this.clearReconnectTimeout();
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
  }

  /**
   * Clear pending reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Reset reconnection attempts (call when connection succeeds)
   */
  public resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}
