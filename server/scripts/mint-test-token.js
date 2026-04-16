import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

const userId = 'ac1c6100-2836-c60a-b54a-b0bda56d54d4';
const tenantId = 'a17e9d40-a011-a14e-0b0e-67b0a0dbc71f';
const email = 'hamed@bartawi.ae';

const token = jwt.sign(
  { sub: userId, tenantId: tenantId, email: email },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRY }
);

console.log(token);
