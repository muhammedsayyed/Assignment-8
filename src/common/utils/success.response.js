export const successResponse = ({ res, data = undefined, message = 'Success', statusCode = 200 } = {}) => {
    return res.status(statusCode).json({ message, status: true, data });
};
