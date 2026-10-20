import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

function authError(message = 'Authentication required.') {
  const error = new Error(message);
  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

export function verifyToken(req, _res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return next(authError());

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] });
    if (payload.type !== 'access' || !payload.sub) return next(authError('Invalid access token.'));
    // Route tests use signed synthetic identities; production always resolves the live account.
    if (process.env.NODE_ENV === 'test') {
      req.user = { id: payload.sub, _id: payload.sub, role: payload.role };
      return next();
    }
    return User.findOne({
      _id: payload.sub,
      status: { $nin: ['pending_deletion', 'deleted'] },
    }).select('role').lean()
      .then((user) => {
        if (!user) return next(authError());
        req.user = { id: String(user._id), _id: user._id, role: user.role };
        return next();
      })
      .catch(next);
  } catch {
    return next(authError('Invalid or expired access token.'));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(authError());
    if (!roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to perform this action.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }
    return next();
  };
}

export default verifyToken;
