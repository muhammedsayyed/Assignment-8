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

export const ConflictException = (
    message = "Conflict",
    issues = []
) => {
    return ApplicationException(message, 409, issues);
};

export const TooManyRequestsException = (
    message = "Too Many Requests",
    issues = []
) => {
    return ApplicationException(message, 429, issues);
};

export const NotfoundException = (
    message = "Notfound",
    issues = []
) => {
    return ApplicationException(message, 404, issues);
};

export const BadException = (
    message = "Bad Request",
    issues = []
) => {
    return ApplicationException(message, 400, issues);
};

export const UnauthorizedException = (
    message = "Unauthorized",
    issues = []
) => {
    return ApplicationException(message, 401, issues);
};

export const ForbiddenException = (
    message = "Forbidden",
    issues = []
) => {
    return ApplicationException(message, 403, issues);
};