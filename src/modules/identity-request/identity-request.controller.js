import { Router } from 'express';
import { successResponse } from '../../common/utils/index.js';
import { authentication } from '../../middleware/authentication.middleware.js';
import { validation } from '../../middleware/validation.middleware.js';
import * as validators from './identity-request.validation.js';
import {
    createIdentityRequest,
    getIdentityRequests,
    getSentIdentityRequests,
    getReceivedIdentityRequests,
    getIdentityRequestById,
    updateIdentityRequestStatus
} from './identity-request.service.js';
import { IdentityRequestStatusEnum } from '../../common/enum/user.enum.js';
import { createConversation } from '../conversation/conversation.service.js';

const router = Router();

// create identity disclosure request for an anonymous message
router.post('/', authentication(), validation(validators.createIdentityRequest), async (req, res) => {
    const data = await createIdentityRequest(req.user, req.validate);
    return successResponse({ res, statusCode: 201, data, message: "Identity request created successfully" });
});

router.get('/sent', authentication(), async (req, res) => {
    const data = await getSentIdentityRequests(req.user);
    return successResponse({ res, data });
});

router.get('/received', authentication(), async (req, res) => {
    const data = await getReceivedIdentityRequests(req.user);
    return successResponse({ res, data });
});

router.get('/', authentication(), async (req, res) => {
    const data = await getIdentityRequests(req.user);
    return successResponse({ res, data });
});

router.get('/:id', authentication(), validation(validators.identityRequestId, "params"), async (req, res) => {
    const data = await getIdentityRequestById(req.user, req.params.id);
    return successResponse({ res, data });
});

// update identity request status
router.patch('/:id', authentication(), validation(validators.identityRequestId, "params"), validation(validators.updateIdentityRequestStatus), async (req, res) => {
    const data = await updateIdentityRequestStatus(req.user, req.params.id, req.validate.status);
    return successResponse({ res, data, message: "Identity request status updated" });
});

// accept identity request (original sender only)
router.patch('/:id/accept', authentication(), validation(validators.identityRequestId, "params"), async (req, res) => {
    const data = await updateIdentityRequestStatus(req.user, req.params.id, IdentityRequestStatusEnum.ACCEPTED);
    return successResponse({ res, data, message: "Identity request accepted successfully" });
});

// reject identity request (original sender only)
router.patch('/:id/reject', authentication(), validation(validators.identityRequestId, "params"), async (req, res) => {
    const data = await updateIdentityRequestStatus(req.user, req.params.id, IdentityRequestStatusEnum.REJECTED);
    return successResponse({ res, data, message: "Identity request rejected successfully" });
});

// create conversation directly from accepted identity request id
router.post('/:id/conversation', authentication(), validation(validators.identityRequestId, "params"), async (req, res) => {
    const data = await createConversation(req.user, { identityRequestId: req.params.id });
    return successResponse({ res, statusCode: 201, data, message: "Conversation created successfully" });
});

export default router;
