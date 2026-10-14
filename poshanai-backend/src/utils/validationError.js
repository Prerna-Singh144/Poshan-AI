export default function validationError() {
  const error = new Error('Request validation failed.');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}
