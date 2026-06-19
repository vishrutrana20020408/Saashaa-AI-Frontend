/**
 * Interview Session API Integration
 *
 * Provides:
 * 1. Axios-based client for Spring Boot REST operations
 * 2. WebSocket initiator for real-time AI engine communication
 *
 * Environment:
 * - NEXT_PUBLIC_API_BASE_URL: Spring Boot backend (e.g., https://api.example.com)
 * - NEXT_PUBLIC_WS_BASE_URL: FastAPI AI engine WebSocket (e.g., wss://ai-engine.example.com)
 *
 * Note: Frontend never connects directly to Supabase. All persistence goes through Spring Boot.
 */

import axios, { AxiosInstance, AxiosError } from "axios";

/* =========================================================
   TYPES
========================================================= */

export interface InterviewSessionPayload {
  userId: string;
  candidateEmail: string;
  resumeText?: string;
  aiPrompt?: string;
  interviewType?: string;
  interviewMode?: "TEXT" | "VOICE" | "VIDEO" | "MIXED";
  difficulty?: number;
  totalQuestions?: number;
  allowHints?: boolean;
  includeBehavioral?: boolean;
  includeTechnical?: boolean;
  preferredLanguage?: string;
  jobDescription?: string;
  githubUrls?: string;
  metadata?: Record<string, unknown>;
}

export interface InterviewSessionResponse {
  id: string | number;
  interviewSessionId?: string | number;
  userId: string;
  candidateEmail: string;
  status: string;
  interviewToken?: string;
  createdAt?: string;
  resumeText?: string;
  aiPrompt?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success?: boolean;
  message: string;
  error?: string;
  status?: number;
  details?: unknown;
}

export interface InterviewWebSocketMessage {
  type: "question" | "answer" | "feedback" | "transcript" | "control" | "error";
  content: string;
  sessionId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface WebSocketConfig {
  sessionId: string;
  userId: string;
  onMessage: (message: InterviewWebSocketMessage) => void;
  onError?: (error: Error | Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_AXIOS_TIMEOUT = 120000; // 2 minutes
const DEFAULT_RECONNECT_ATTEMPTS = 3;
const DEFAULT_RECONNECT_DELAY = 3000; // 3 seconds
const SPRING_BOOT_SAVE_ENDPOINT = "/api/v1/interviews/save";

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getApiBaseUrl(): string {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return "http://localhost:8080";
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

function getWebSocketBaseUrl(): string {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return "ws://localhost:8000";
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WS_BASE_URL ||
    process.env.NEXT_PUBLIC_AI_ENGINE_WS_URL ||
    "ws://localhost:8000";

  return baseUrl.replace(/\/+$/, "");
}

function normalizeWebSocketUrl(url: string): string {
  if (url.startsWith("http://")) {
    return url.replace(/^http:\/\//i, "ws://");
  }
  if (url.startsWith("https://")) {
    return url.replace(/^https:\/\//i, "wss://");
  }
  return url;
}

function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return axios.isAxiosError(error);
}

/* =========================================================
   AXIOS CLIENT FACTORY
========================================================= */

export function createInterviewAxiosClient(
  accessToken?: string
): AxiosInstance {
  const baseURL = getApiBaseUrl();

  const client = axios.create({
    baseURL,
    timeout: DEFAULT_AXIOS_TIMEOUT,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  // Add response interceptor for error normalization
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Unknown API error";

        const apiError: ApiErrorResponse = {
          message,
          status: error.response?.status,
          details: error.response?.data?.details,
        };

        return Promise.reject(apiError);
      }

      return Promise.reject({
        message: String(error),
        status: 500,
      });
    }
  );

  return client;
}

/* =========================================================
   INTERVIEW SESSION API (SPRING BOOT)
========================================================= */

export class InterviewSessionApiClient {
  private axiosInstance: AxiosInstance;
  private baseURL: string;

  constructor(accessToken?: string) {
    this.axiosInstance = createInterviewAxiosClient(accessToken);
    this.baseURL = getApiBaseUrl();
  }

  /**
   * Save/create a new interview session via Spring Boot REST endpoint.
   * This persists data to Supabase PostgreSQL through the backend.
   */
  async createSession(
    payload: InterviewSessionPayload
  ): Promise<InterviewSessionResponse> {
    try {
      const response = await this.axiosInstance.post<InterviewSessionResponse>(
        SPRING_BOOT_SAVE_ENDPOINT,
        payload
      );

      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(
          `Failed to create interview session: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Fetch an existing interview session by ID.
   */
  async getSession(
    sessionId: string | number
  ): Promise<InterviewSessionResponse> {
    try {
      const response = await this.axiosInstance.get<InterviewSessionResponse>(
        `/api/interview/session/${sessionId}`
      );

      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(
          `Failed to fetch interview session: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Update session status or metadata.
   */
  async updateSession(
    sessionId: string | number,
    updates: Partial<InterviewSessionPayload>
  ): Promise<InterviewSessionResponse> {
    try {
      const response = await this.axiosInstance.put<InterviewSessionResponse>(
        `/api/interview/session/${sessionId}`,
        updates
      );

      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(
          `Failed to update interview session: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Submit user answer for current question.
   */
  async submitAnswer(
    sessionId: string | number,
    answerText: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.axiosInstance.post(
        `/api/interview/session/${sessionId}/answer`,
        {
          answer: answerText,
          metadata,
        }
      );

      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        throw new Error(
          `Failed to submit answer: ${
            error.response?.data?.message || error.message
          }`
        );
      }
      throw error;
    }
  }
}

/* =========================================================
   WEBSOCKET CLIENT (FASTAPI AI ENGINE)
========================================================= */

export class InterviewWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts: number = 0;
  private isManualClose: boolean = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: DEFAULT_RECONNECT_ATTEMPTS,
      reconnectDelay: DEFAULT_RECONNECT_DELAY,
      ...config,
    };
  }

  /**
   * Establish WebSocket connection to AI engine.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsBaseUrl = getWebSocketBaseUrl();
        const normalizedUrl = normalizeWebSocketUrl(wsBaseUrl);
        const fullUrl = `${normalizedUrl}/ws/interview/${this.config.sessionId}?userId=${this.config.userId}`;

        this.ws = new WebSocket(fullUrl);
        this.isManualClose = false;

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          if (this.config.onOpen) {
            this.config.onOpen();
          }
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message: InterviewWebSocketMessage = JSON.parse(event.data);
            if (this.config.onMessage) {
              this.config.onMessage(message);
            }
          } catch (parseError) {
            console.error("Failed to parse WebSocket message:", parseError);
          }
        };

        this.ws.onerror = (error: Event) => {
          const errorMessage =
            error instanceof ErrorEvent
              ? error.message
              : "WebSocket connection error";

          if (this.config.onError) {
            this.config.onError(new Error(errorMessage));
          }

          if (this.reconnectAttempts === 0) {
            reject(new Error(errorMessage));
          }
        };

        this.ws.onclose = () => {
          if (!this.isManualClose && this.reconnectAttempts < (this.config.reconnectAttempts || 0)) {
            this.reconnectAttempts++;
            const delay = (this.config.reconnectDelay || DEFAULT_RECONNECT_DELAY) * this.reconnectAttempts;
            setTimeout(() => {
              this.connect().catch((err) => {
                if (this.config.onError) {
                  this.config.onError(err);
                }
              });
            }, delay);
          } else if (this.config.onClose) {
            this.config.onClose();
          }
        };
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to initialize WebSocket")
        );
      }
    });
  }

  /**
   * Send message to AI engine.
   */
  send(message: Partial<InterviewWebSocketMessage>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected");
      return;
    }

    try {
      const payload: InterviewWebSocketMessage = {
        type: message.type || "control",
        content: message.content || "",
        sessionId: this.config.sessionId,
        timestamp: new Date().toISOString(),
        metadata: message.metadata,
      };

      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
    }
  }

  /**
   * Gracefully close WebSocket connection.
   */
  disconnect(): void {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }

  /**
   * Check connection status.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/* =========================================================
   FACTORY HELPERS
========================================================= */

/**
 * Create and initialize both REST and WebSocket clients for a full interview session.
 */
export async function initializeInterviewSession(
  payload: InterviewSessionPayload,
  wsConfig: Omit<WebSocketConfig, "sessionId" | "userId">,
  accessToken?: string
): Promise<{
  restClient: InterviewSessionApiClient;
  wsClient: InterviewWebSocketClient;
  session: InterviewSessionResponse;
}> {
  const restClient = new InterviewSessionApiClient(accessToken);

  // Create session via REST
  const session = await restClient.createSession(payload);

  if (!session.id && !session.interviewSessionId) {
    throw new Error("Failed to create interview session: No session ID returned");
  }

  const sessionId = String(session.id || session.interviewSessionId);

  // Initialize WebSocket connection
  const wsClient = new InterviewWebSocketClient({
    ...wsConfig,
    sessionId,
    userId: payload.userId,
  });

  // Connect WebSocket
  await wsClient.connect();

  return {
    restClient,
    wsClient,
    session,
  };
}

/* =========================================================
   SINGLETON INSTANCE (OPTIONAL)
========================================================= */

let globalRestClient: InterviewSessionApiClient | null = null;

export function getOrCreateRestClient(
  accessToken?: string
): InterviewSessionApiClient {
  if (!globalRestClient) {
    globalRestClient = new InterviewSessionApiClient(accessToken);
  }
  return globalRestClient;
}

export function resetRestClient(): void {
  globalRestClient = null;
}
