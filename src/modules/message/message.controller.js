import {Router} from 'express';
import { successResponse } from '../../common/utils/index.js';
const router = Router();

// create a new message
router.post('/', (req, res) => {
    return successResponse({res,status: 201})
})

export default router


