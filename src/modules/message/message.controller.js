import { Router } from 'express';
import { successResponse } from '../../common/utils/index.js';
import { authentication } from '../../middleware/authentication.middleware.js';
import { validation } from '../../middleware/validation.middleware.js';
import * as validators from '../authentication/authentication.validation.js';
import { createMessage, getMessages, getMessageById } from './message.service.js';
import { createIdentityRequest } from '../identity-request/identity-request.service.js';

const router = Router();

router.post('/', authentication(), validation(validators.createMessage), async (req, res) => {
    const data = await createMessage(req.user, req.validate);
    return successResponse({ res, statusCode: 201, data });
});

router.get('/', authentication(), async (req, res) => {
    const data = await getMessages(req.user);
    return successResponse({ res, data });
});

router.get('/:id', authentication(), validation(validators.userId, "params"), async (req, res) => {
    const data = await getMessageById(req.user, req.params.id);
    return successResponse({ res, data });
});

router.post('/:id/identity-request', authentication(), validation(validators.userId, "params"), async (req, res) => {
    const data = await createIdentityRequest(req.user, { messageId: req.params.id });
    return successResponse({ res, statusCode: 201, data, message: "Identity request created successfully" });
});

export default router;
