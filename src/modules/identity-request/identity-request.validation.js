import { z } from "zod";

export const createIdentityRequest = z.strictObject({
    messageId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    message: z.string().regex(/^[0-9a-fA-F]{24}$/).optional()
}).refine(data => data.messageId || data.message, {
    message: "messageId is required"
});

export const identityRequestId = z.strictObject({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/)
});

export const updateIdentityRequestStatus = z.strictObject({
    status: z.union([
        z.enum(["accepted", "rejected", "ACCEPTED", "REJECTED"]),
        z.literal(1),
        z.literal(2),
        z.enum(["1", "2"]).transform(Number)
    ])
});
