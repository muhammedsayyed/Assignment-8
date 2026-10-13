import { Router } from 'express';
import { successResponse } from '../../common/utils/index.js';
import { authentication } from '../../middleware/authentication.middleware.js';
import { validation } from '../../middleware/validation.middleware.js';
import * as validators from './conversation.validation.js';
import {
    createConversation,
    getConversations,
    getConversationById,
    sendConversationMessage,
    getConversationMessages
} from './conversation.service.js';

const router = Router();

router.post('/', authentication(), validation(validators.createConversation), async (req, res) => {
    const data = await createConversation(req.user, req.validate);
    return successResponse({ res, statusCode: 201, data, message: "Conversation created successfully" });
});

router.get('/', authentication(), async (req, res) => {
    const data = await getConversations(req.user);
    return successResponse({ res, data });
});

router.get('/:id', authentication(), validation(validators.conversationId, "params"), async (req, res) => {
    const data = await getConversationById(req.user, req.params.id);
    return successResponse({ res, data });
});

router.post('/:id/message', authentication(), validation(validators.conversationId, "params"), validation(validators.sendMessage), async (req, res) => {
    const data = await sendConversationMessage(req.user, req.params.id, req.validate);
    return successResponse({ res, statusCode: 201, data, message: "Message sent successfully" });
});

router.post('/:id/messages', authentication(), validation(validators.conversationId, "params"), validation(validators.sendMessage), async (req, res) => {
    const data = await sendConversationMessage(req.user, req.params.id, req.validate);
    return successResponse({ res, statusCode: 201, data, message: "Message sent successfully" });
});

router.get('/:id/message', authentication(), validation(validators.conversationId, "params"), async (req, res) => {
    const data = await getConversationMessages(req.user, req.params.id);
    return successResponse({ res, data });
});

router.get('/:id/messages', authentication(), validation(validators.conversationId, "params"), async (req, res) => {
    const data = await getConversationMessages(req.user, req.params.id);
    return successResponse({ res, data });
});

export default router;
