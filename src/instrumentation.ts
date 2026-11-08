import type { Instrumentation } from 'next';
import { reportServerError } from '@/lib/errorForwarding';

// Uncaught errors while rendering a page or running an API route go to thfradio.space's error
// log, like browser errors. Not awaited: reporting must never hold up the response.
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  reportServerError(error, request, context);
};
