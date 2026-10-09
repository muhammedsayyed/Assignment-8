import { LangEnum } from "../common/enum/security.enum.js";
import { BadException } from "../common/exceptions/error.exception.js";

export const validation = (schema, property = "body") => {
    return (req, res, next) => {
        const lang = Number(req.headers?.['accept-language'] ?? LangEnum.EN);
        const resolvedSchema = typeof schema === "function" ? schema(lang) : schema;

        const isMultiPart = resolvedSchema?.shape && (resolvedSchema.shape.body || resolvedSchema.shape.query || resolvedSchema.shape.params);

        let validationResult;
        if (isMultiPart) {
            validationResult = resolvedSchema.safeParse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            if (!validationResult.success) {
                throw BadException("Validation Error", validationResult.error.issues);
            }
            req.validate = Object.assign(
                validationResult.data.body ? { ...validationResult.data.body } : {},
                validationResult.data
            );
        } else {
            validationResult = resolvedSchema.safeParse(req[property]);
            if (!validationResult.success) {
                throw BadException("Validation Error", validationResult.error.issues);
            }
            req.validate = validationResult.data;
        }
        next();
    };
};
