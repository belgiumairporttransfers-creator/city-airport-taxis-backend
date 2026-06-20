import express, { Application, Request, Response } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "@/config/env";
import { createRateLimitStore } from "@/infrastructure/redis/rate-limit-store";
import routes from "@/routes";
import { errorHandler } from "@/middleware/errorHandler";
import { setupSentryErrorHandler } from "@/shared/observability/apm";
import { requestLoggerMiddleware } from "@/shared/observability/request-logger.middleware";
import logger from "@/shared/utils/logger";
import { getHealthReport, getPublicHealthReport, getHealthStatusCode } from "@/modules/health";
import { isHealthAuthorized, requireHealthAuth } from "@/middleware/health-auth";

const app: Application = express();

app.set("trust proxy", env.TRUST_PROXY_HOPS);

app.use(requestLoggerMiddleware);
app.use(helmet());

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    if (env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "X-CSRF-Token"],
  credentials: true,
  exposedHeaders: ["set-cookie", "X-CSRF-Token"],
};

app.use(cors(corsOptions));

const rateLimitStore = createRateLimitStore("global");

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
    errorCode: "RATE_LIMIT_EXCEEDED",
  },
  ...(rateLimitStore ? { store: rateLimitStore } : {}),
});

app.use("/api/", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "City Airport Taxis Backend API is working fine!",
    timestamp: new Date().toISOString(),
    status: "operational",
  });
});

app.get("/health/live", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Process is alive",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/ready", requireHealthAuth, async (req: Request, res: Response) => {
  try {
    const report = isHealthAuthorized(req)
      ? await getHealthReport()
      : await getPublicHealthReport();
    res.status(getHealthStatusCode(report, true)).json(report);
  } catch (error) {
    logger.error("Readiness check failed", { error });
    res.status(503).json({
      success: false,
      message: "Readiness check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/health", requireHealthAuth, async (req: Request, res: Response) => {
  try {
    const report = isHealthAuthorized(req)
      ? await getHealthReport(true)
      : await getPublicHealthReport();
    res.status(getHealthStatusCode(report, true)).json(report);
  } catch (error) {
    logger.error("Health check failed", { error });
    res.status(503).json({
      success: false,
      message: "Health check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(routes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    errorCode: "RESOURCE_NOT_FOUND",
  });
});

export const applyErrorHandlers = (application: Application): void => {
  if (application.get("errorHandlersApplied")) {
    return;
  }

  application.set("errorHandlersApplied", true);
  setupSentryErrorHandler(application);
  application.use(errorHandler);
};

if (process.env.NODE_ENV === "test" || process.env.VITEST) {
  applyErrorHandlers(app);
}

export default app;
