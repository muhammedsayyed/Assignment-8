export const globalErrorHandler = (error, req, res, next) => {
    const status = error.cause?.status ?? 500;
    return res.status(status).json({
        error_message: error.message || "Server Error",
        status,
        issues: error.cause?.issues || [],
    });
};