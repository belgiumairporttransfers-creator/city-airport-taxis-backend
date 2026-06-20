import Joi from "joi";

export const uploadBodySchema = Joi.object({
  folder: Joi.string().trim().max(80).optional(),
});
