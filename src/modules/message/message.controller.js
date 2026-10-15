import { Router } from 'express';
import { successResponse } from '../../common/utils/index.js';
import { authentication, optionalAuthentication } from '../../middleware/authentication.middleware.js';
import { validation } from '../../middleware/validation.middleware.js';
import { uploadMiddleware } from '../../middleware/multer.middleware.js';
import { fileValidation, localFileUpload } from '../../common/utils/index.js';
import * as validators from '../authentication/authentication.validation.js';
import { createMessage, getMessages, getMessageById, markMessageAsRead, deleteMessage } from './message.service.js';
import { createIdentityRequest } from '../identity-request/identity-request.service.js';

const router = Router();

router.post('/', optionalAuthentication, uploadMiddleware({
    isRequired: false,
    multerMiddleware: localFileUpload({ maxFileSize: 5 }).array('attachments', 3),
    customPath: 'messages',
    validation: fileValidation.image
}), validation(validators.createMessage), async (req, res) => {
    const data = await createMessage(req.user, req.validate, req.files || []);
    return successResponse({ res, statusCode: 201, data });
});

// fetch received messages for authenticated user
router.get('/', authentication(), async (req, res) => {
    const data = await getMessages(req.user, req.query.type);
    return successResponse({ res, data });
});

router.get('/:id', authentication(), validation(validators.userId, "params"), async (req, res) => {
    const data = await getMessageById(req.user, req.params.id);
    return successResponse({ res, data });
});

router.patch('/:id/read', authentication(), validation(validators.userId, "params"), async (req, res) => {
    const data = await markMessageAsRead(req.user, req.params.id);
    return successResponse({ res, data, message: "Message marked as read" });
});

router.delete('/:id', authentication(), validation(validators.userId, "params"), async (req, res) => {
    const data = await deleteMessage(req.user, req.params.id);
    return successResponse({ res, data, message: "Message deleted successfully" });
});

// request sender identity disclosure for a specific message
router.post('/:id/identity-request', authentication(), validation(validators.userId, "params"), async (req, res) => {
    const data = await createIdentityRequest(req.user, { messageId: req.params.id });
    return successResponse({ res, statusCode: 201, data, message: "Identity request created successfully" });
});

export default router;
