import { AsyncLocalStorage } from 'node:async_hooks';

// Guarda el ID del request en curso para que cualquier log (controller, service, repository) lo incluya sin pasarlo a mano.
export const requestContext = new AsyncLocalStorage();

export const currentRequestId = () => requestContext.getStore()?.requestId;
