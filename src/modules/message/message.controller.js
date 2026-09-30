import {Router} from 'express';
import { successResponse } from '../../common/utils/index.js';
import { authentication } from '../../middleware/authentication.middleware.js';
import { validation } from '../../middleware/validation.middleware.js';
import * as validators from '../authentication/authentication.validation.js';
import { createMessage } from './message.service.js';
const router = Router();

// create a new message
router.post('/', authentication(), validation(validators.createMessage), async (req, res) => {
    const data = await createMessage(req.user, req.validate)
    return successResponse({res,statusCode: 201, data})
})

export default router
