export const sendSuccess = (res, payload, statusCode = 200) => res.status(statusCode).json({ status: 'success', payload });

export const sendPage = (res, { items, pagination }) => res.status(200).json({ status: 'success', payload: items, pagination });
