import fetch from 'node-fetch'

const CAMP_ID = '4c935f2b-23b9-b94c-99ca-cb2ee0620045'
const API_URL = `http://localhost:3001/api/v1/rooms?camp_id=${CAMP_ID}`

async function test() {
  try {
    const response = await fetch(API_URL)
    const json = await response.json()

    console.log('Response status:', response.status)
    console.log('Response keys:', Object.keys(json))

    if (json.error) {
      console.log('❌ API Error:', json.error)
      return
    }

    if (!json.data || !Array.isArray(json.data)) {
      console.log('❌ No data array in response')
      console.log('Full response:', JSON.stringify(json, null, 2).slice(0, 500))
      return
    }

    const bb6 = json.data.find(r => r.room_number === 'BB06')

    if (!bb6) {
      console.log('❌ BB06 not found in API response')
      console.log(`Found ${json.data.length} rooms, sample room numbers:`, json.data.slice(0, 5).map(r => r.room_number))
      return
    }

    console.log('\n=== BB-6 API Response ===\n')
    console.log('Room Number:', bb6.room_number)
    console.log('Status:', bb6.status)
    console.log('\ncurrent_month:')
    console.log(JSON.stringify(bb6.current_month, null, 2))
    console.log('\nmonthly_records (last 3):')
    console.log(JSON.stringify(bb6.monthly_records, null, 2))
    console.log('\n_current_is_latest_available:', bb6._current_is_latest_available)
  } catch (err) {
    console.error('❌ API Error:', err.message)
    console.error(err.stack)
  }
}

test()
