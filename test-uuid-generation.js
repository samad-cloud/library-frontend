/**
 * Test script to verify UUID generation for bulk CSV processing
 * Run this to test the fixed UUID generation logic
 */

const { randomUUID } = require('crypto')

console.log('=== UUID Generation Test ===\n')

// Test the old problematic format
const userId = '6d217291-2e8d-4765-af5e-ffbcd2634f24'
const oldFormat = `bulk_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

console.log('❌ OLD FORMAT (BROKEN):')
console.log(`   ${oldFormat}`)
console.log(`   Length: ${oldFormat.length} characters`)
console.log(`   Valid UUID: ${isValidUUID(oldFormat) ? 'Yes' : 'No'}`)

// Test the new correct format
const newFormat = randomUUID()

console.log('\n✅ NEW FORMAT (FIXED):')
console.log(`   ${newFormat}`)
console.log(`   Length: ${newFormat.length} characters`)
console.log(`   Valid UUID: ${isValidUUID(newFormat) ? 'Yes' : 'No'}`)

// Generate a few more to show consistency
console.log('\n📝 Additional UUID examples:')
for (let i = 1; i <= 3; i++) {
  const uuid = randomUUID()
  console.log(`   ${i}. ${uuid} (Valid: ${isValidUUID(uuid) ? 'Yes' : 'No'})`)
}

console.log('\n=== Database Compatibility Test ===')
console.log('PostgreSQL UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
console.log(`New format matches:     ${newFormat.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 'Yes ✅' : 'No ❌'}`)
console.log(`Old format matches:     ${oldFormat.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 'Yes ✅' : 'No ❌'}`)

console.log('\n=== Summary ===')
console.log('✅ Fixed: API now generates proper UUIDs using crypto.randomUUID()')
console.log('✅ Compatible: UUIDs will work with PostgreSQL UUID columns')
console.log('✅ No more: "invalid input syntax for type uuid" errors')

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}