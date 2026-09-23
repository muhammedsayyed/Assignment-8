import {Router} from 'express';
import { successResponse } from '../../common/utils/index.js';
import { login, signup } from './authentication.service.js';
import * as validators from './authentication.validation.js'
import { validation } from '../../middleware/validation.middleware.js';
const router = Router();

// signup route
router.post("/signup", validation(validators.signup) ,async (req, res, next) => {
    const data = await signup(req.body)
    return successResponse({ res, status: 201, data })
})




// login route
router.post("/login",  validation(validators.login) , async (req, res, next) => {
    const data = await login(req.validate, `${req.protocol}://${req.host}`)
    return successResponse({ res, data })
})

export default router