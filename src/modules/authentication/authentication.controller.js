import { Router } from 'express';
import { successResponse } from '../../common/utils/index.js';
import {
    confirmEmail,
    confirmTwoStepVerification,
    disableTwoStepVerification,
    enableTwoStepVerification,
    login,
    loginConfirmation,
    LoginWithGmail,
    logout,
    requestForgotPassword,
    resendConfirmEmail,
    resetPassword,
    signup,
    verifyForgotPassword
} from './authentication.service.js';
import * as validators from './authentication.validation.js';
import { validation } from '../../middleware/validation.middleware.js';
import { authentication } from '../../middleware/authentication.middleware.js';

const router = Router();

router.post('/loginWithGmail', async (req, res) => {
    try {
        const data = await LoginWithGmail(req.body, `${req.protocol}://${req.host}`);
        return successResponse({ res, data, statusCode: 201 });
    } catch (error) {
        console.error("Google Login Error:", error);
        return successResponse({ res, data: error.message, statusCode: 400 });
    }
});

router.post("/signup", validation(validators.signup), async (req, res, next) => {
    const data = await signup(req.validate.body || req.validate);
    return successResponse({ res, statusCode: 201, data });
});

router.patch("/confirm-email", validation(validators.confirmEmail), async (req, res, next) => {
    const data = await confirmEmail(req.validate.body || req.body);
    return successResponse({ res, status: 200, data });
});

router.patch("/resend-confirm-email", validation(validators.resendConfirmEmail), async (req, res, next) => {
    const data = await resendConfirmEmail(req.validate.body || req.body);
    return successResponse({ res, status: 200, data });
});

router.post("/request-confirm-password", validation(validators.resendConfirmEmail), async (req, res, next) => {
    const data = await requestForgotPassword(req.validate.body || req.body);
    return successResponse({ res, status: 201, data });
});

router.post("/verify-forgot-password", validation(validators.confirmEmail), async (req, res, next) => {
    const data = await verifyForgotPassword(req.validate.body || req.body);
    return successResponse({ res, status: 200, data });
});

router.patch("/reset-password", validation(validators.resetPassword), async (req, res, next) => {
    const data = await resetPassword(req.validate.body || req.body);
    return successResponse({ res, status: 200, data });
});

router.post("/login", validation(validators.login), async (req, res, next) => {
    const data = await login(req.validate.body || req.validate, `${req.protocol}://${req.host}`);
    return successResponse({ res, data });
});

router.post("/enable-2-step", authentication(), async (req, res, next) => {
    const data = await enableTwoStepVerification({ user: req.user });
    return successResponse({ res, data });
});

router.post("/login-confirmation", validation(validators.confirmTwoStepVerification), async (req, res, next) => {
    const data = await loginConfirmation(req.validate.body || req.body, `${req.protocol}://${req.host}`);
    return successResponse({ res, data });
});

router.patch("/confirm-2-step", authentication(), validation(validators.confirmTwoStepVerification), async (req, res, next) => {
    const body = req.validate.body || req.body;
    const data = await confirmTwoStepVerification({ user: req.user, email: body.email, otp: body.otp });
    return successResponse({ res, data });
});

router.patch("/disable-2-step", authentication(), async (req, res, next) => {
    const data = await disableTwoStepVerification({ user: req.user });
    return successResponse({ res, data });
});

router.post("/logout", authentication(), async (req, res) => {
    const data = await logout(req.payload || req.token, req.user, req.body);
    return successResponse({ res, data, message: "Logged out successfully" });
});

export default router;
