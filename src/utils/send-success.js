export const sendSuccess = (res, payload, statusCode = 200) => res.status(statusCode).json({ status: 'success', payload });
