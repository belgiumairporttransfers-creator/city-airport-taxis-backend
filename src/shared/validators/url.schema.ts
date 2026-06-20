import Joi from "joi";

export const avatarUrlSchema = Joi.alternatives().try(
  Joi.string().trim().allow(""),
  Joi.string()
    .trim()
    .uri({ scheme: ["http", "https"] })
    .max(2048)
    .messages({
      "string.uri": "Avatar must be a valid http or https URL",
    })
);
