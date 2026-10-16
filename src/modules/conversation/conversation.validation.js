import { z } from "zod";

export const createConversation = z.strictObject({
    identityRequestId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    identityRequest: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional()
}).refine(data => data.identityRequestId || data.identityRequest || data.requestId, {
    message: "identityRequestId is required"
});

export const conversationId = z.strictObject({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/)
});

export const sendMessage = z.strictObject({
    content: z.string().trim().max(1000).optional().default("")
});
