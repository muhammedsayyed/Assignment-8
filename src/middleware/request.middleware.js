export const requestMiddleware = (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    const startedAt = Date.now();
    res.on("finish", () => {
        console.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
};
