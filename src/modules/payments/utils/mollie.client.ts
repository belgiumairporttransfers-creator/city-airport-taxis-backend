import { AppError } from "@/shared/errors/AppError";
import logger from "@/shared/utils/logger";
import {
  MOLLIE_API_BASE,
  MOLLIE_REQUEST_TIMEOUT_MS,
  MOLLIE_RETRYABLE_HTTP_STATUSES,
} from "./mollie.constants";
import type {
  CreateMolliePaymentInput,
  MollieApiErrorBody,
  MolliePaymentResponse,
  MollieRequestOptions,
  MollieRequestResult,
} from "./mollie.types";

class MollieClient {
  createPayment(
    input: CreateMolliePaymentInput,
    options: MollieRequestOptions
  ): Promise<MolliePaymentResponse> {
    return this.request<MolliePaymentResponse>(
      "/payments",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      options
    );
  }

  getPayment(paymentId: string, options: MollieRequestOptions): Promise<MolliePaymentResponse> {
    return this.request<MolliePaymentResponse>(
      `/payments/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
      },
      options
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    options: MollieRequestOptions
  ): Promise<T> {
    this.assertConfigured(options.apiKey);

    const method = (init.method ?? "GET").toUpperCase();
    const allowRetry = method === "GET";
    const maxAttempts = allowRetry ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const result = await this.executeOnce<T>(path, init, options.apiKey);

      if (result.ok) {
        return result.data;
      }

      const shouldRetry =
        allowRetry &&
        attempt < maxAttempts &&
        this.isRetryableHttpStatus(result.status);

      if (shouldRetry) {
        logger.warn("Mollie API request retrying", {
          method,
          endpoint: this.buildEndpoint(path),
          status: result.status,
          attempt,
        });
        continue;
      }

      this.throwProviderError(method, path, result.status, result.errorBody);
    }

    throw new AppError("Failed to communicate with payment provider", 502);
  }

  private async executeOnce<T>(
    path: string,
    init: RequestInit,
    apiKey: string
  ): Promise<MollieRequestResult<T>> {
    const method = (init.method ?? "GET").toUpperCase();
    const endpoint = this.buildEndpoint(path);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MOLLIE_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
      });

      const body = await this.parseResponseBody(response);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          errorBody: body,
        };
      }

      return {
        ok: true,
        data: body as T,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error("Mollie API request timed out", {
          method,
          endpoint,
          timeoutMs: MOLLIE_REQUEST_TIMEOUT_MS,
        });
        throw new AppError("Payment provider request timed out", 504);
      }

      logger.error("Mollie API network error", {
        method,
        endpoint,
        error: error instanceof Error ? error.message : "Unknown network error",
      });
      throw new AppError("Failed to communicate with payment provider", 502);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private assertConfigured(apiKey: string): void {
    if (!apiKey.trim()) {
      throw new AppError("Mollie is not configured", 503);
    }
  }

  private buildEndpoint(path: string): string {
    return `${MOLLIE_API_BASE}${path}`;
  }

  private isRetryableHttpStatus(status: number): boolean {
    return (MOLLIE_RETRYABLE_HTTP_STATUSES as readonly number[]).includes(status);
  }

  private async parseResponseBody(response: Response): Promise<MollieApiErrorBody> {
    try {
      return (await response.json()) as MollieApiErrorBody;
    } catch {
      return {};
    }
  }

  private throwProviderError(
    method: string,
    path: string,
    status: number,
    errorBody: MollieApiErrorBody
  ): never {
    const endpoint = this.buildEndpoint(path);
    const message = this.resolveErrorMessage(errorBody, status);

    logger.error("Mollie API error", {
      method,
      endpoint,
      status,
      title: errorBody.title,
      detail: errorBody.detail,
      field: errorBody.field,
      responseBody: errorBody,
    });

    throw new AppError(message, this.mapHttpStatusToAppError(status));
  }

  private resolveErrorMessage(errorBody: MollieApiErrorBody, status: number): string {
    if (errorBody.detail) {
      return errorBody.detail;
    }

    if (errorBody.title) {
      return errorBody.title;
    }

    if (status === 401 || status === 403) {
      return "Payment provider authentication failed";
    }

    if (status === 404) {
      return "Payment provider resource not found";
    }

    if (status === 422) {
      return "Payment provider rejected the request";
    }

    return "Failed to communicate with payment provider";
  }

  private mapHttpStatusToAppError(status: number): number {
    if (status === 401 || status === 403) {
      return 503;
    }

    if (status === 404) {
      return 404;
    }

    if (status === 422) {
      return 400;
    }

    if (status >= 500) {
      return 502;
    }

    return 502;
  }
}

export default new MollieClient();
