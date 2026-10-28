import jwt from 'jsonwebtoken'

export function signAccessToken(user) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  // Customers and mechanics stay signed in for 30 days (renewed while they keep using the app,
  // see getMe); the admin web login keeps the shorter 7 days.
  const expiresIn = process.env.JWT_EXPIRES_IN || (user.role === 'admin' ? '7d' : '30d')
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      phone: user.phone,
    },
    secret,
    { expiresIn },
  )
}

export function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return jwt.verify(token, secret)
}
