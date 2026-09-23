// base error handler - throws error with status and issues
export const ApplicationException = (
    message = "Internal Server Error",
    status = 500,
    issues = []
    ) => {
    throw new Error(message, {
        cause: {
        status,
        issues,
        },
    });
};

// 409 conflict
export const ConflictException = (
    message = "Conflict",
    issues = []
    ) => {
    return ApplicationException(message, 409, issues);
};

// 404 not found
export const NotfoundException = (
    message = "Notfound",
    issues = []
    ) => {
    return ApplicationException(message, 404, issues);
};

// 400 bad request
export const BadException = (
    message = "Bad Request",
    issues = []
    ) => {
    return ApplicationException(message, 400, issues);
};

// 401 unauthorized
export const UnauthorizedException = (
    message = "Unauthorized",
    issues = []
    ) => {
    return ApplicationException(message, 401, issues);
};

// 403 forbidden
export const ForbiddenException = (
    message = "Forbidden",
    issues = []
    ) => {
    return ApplicationException(message, 403, issues);
};