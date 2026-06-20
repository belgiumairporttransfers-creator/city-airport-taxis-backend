import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { AppError } from "@/shared/errors/AppError";

const validate =
  (schema: ObjectSchema, source: "body" | "params" | "query") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const target =
      source === "body" ? req.body : source === "params" ? req.params : req.query;

    const { error, value } = schema.validate(target, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message.replace(/['"]/g, ""))
        .join(", ");
      return next(new AppError(errorMessage, 400));
    }

    if (source === "body") {
      req.body = value;
    } else if (source === "params") {
      req.params = value;
    } else {
      Object.assign(req.query, value);
    }

    next();
  };

export const validateRequest = (schema: ObjectSchema) => validate(schema, "body");
export const validateParams = (schema: ObjectSchema) => validate(schema, "params");
export const validateQuery = (schema: ObjectSchema) => validate(schema, "query");
