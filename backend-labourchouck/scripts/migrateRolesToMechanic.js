/**
 * One-off, idempotent migration for the car/bike mechanic app.
 *
 * - users.role 'labour' -> 'mechanic'
 * - withdrawal requests: requesterRole 'labour' -> 'mechanic'
 * - terms / privacy policy docs: role 'labour' -> 'mechanic' (only when no 'mechanic' doc exists yet)
 * - REPORTS (never deletes) how many 'contractor' / 'corporate' users still exist.
 *
 * Usage: npm run migrate:roles
 */
import 'dotenv/config'
import mongoose from 'mongoose'

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  await mongoose.connect(uri)
  const db = mongoose.connection.db

  const users = db.collection('users')
  const res = await users.updateMany({ role: 'labour' }, { $set: { role: 'mechanic' } })
  console.log(`[migrate:roles] users labour -> mechanic: matched ${res.matchedCount}, modified ${res.modifiedCount}`)

  const wd = await db
    .collection('withdrawalrequests')
    .updateMany({ requesterRole: 'labour' }, { $set: { requesterRole: 'mechanic' } })
  console.log(`[migrate:roles] withdrawal requests requesterRole labour -> mechanic: modified ${wd.modifiedCount}`)

  for (const [label, coll] of [
    ['terms', 'termsandconditions'],
    ['privacy policy', 'privacypolicies'],
  ]) {
    const c = db.collection(coll)
    const hasMechanic = await c.countDocuments({ role: 'mechanic' })
    if (hasMechanic) {
      console.log(`[migrate:roles] ${label}: mechanic doc already exists, skipped`)
      continue
    }
    const r = await c.updateMany({ role: 'labour' }, { $set: { role: 'mechanic' } })
    console.log(`[migrate:roles] ${label} labour -> mechanic: modified ${r.modifiedCount}`)
  }

  const contractors = await users.countDocuments({ role: 'contractor' })
  const corporates = await users.countDocuments({ role: 'corporate' })
  const remainingLabour = await users.countDocuments({ role: 'labour' })
  console.log(`[migrate:roles] remaining users with role 'labour': ${remainingLabour}`)
  console.log(`[migrate:roles] users with removed role 'contractor': ${contractors} (not modified)`)
  console.log(`[migrate:roles] users with removed role 'corporate': ${corporates} (not modified)`)
  if (contractors || corporates) {
    console.log('[migrate:roles] These accounts can no longer use the app; review or remove them manually.')
  }
}

run()
  .catch((err) => {
    console.error('[migrate:roles] failed:', err)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
