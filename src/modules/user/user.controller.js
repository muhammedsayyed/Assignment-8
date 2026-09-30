import {Router} from 'express';
import { successResponse } from '../../common/utils/index.js';
import { profile, rotateToken, update } from './user.service.js';
import { authentication, authorization } from '../../middleware/authentication.middleware.js';
import { TokenTypeEnum } from '../../common/enum/security.enum.js';
import { RoleEnum } from '../../common/enum/user.enum.js';
import { validation } from '../../middleware/validation.middleware.js';
import * as validators from '../authentication/authentication.validation.js'
const router = Router();

// get user profile
router.get('/', authentication(), async (req, res) => {
    const data = await profile(req.user)
    return successResponse({res,data})
})


// update user data
router.patch("/", authentication(), authorization(RoleEnum.USER), validation(validators.updateProfile), async (req, res) => {
    const data = await update(req.user, req.validate)
    return successResponse({res,data})
})

router.get("/:id", authentication(), validation(validators.userId, "params"), async (req, res) => {
    const data = await profile({ _id: req.params.id })
    return successResponse({ res, data })
})


// refresh access token using refresh token
router.post("/rotate-token", authentication(TokenTypeEnum.REFRESH), async (req, res) => {
    const data = await rotateToken(req.payload, req.user, `${req.protocol}://${req.host}`)
    return successResponse({res,data})
})



export default router
