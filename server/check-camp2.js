import fetch from 'node-fetch';

async function checkCamp2() {
  try {
    const response = await fetch('http://localhost:3001/api/v1/rooms?camp_id=1af2c34d-6c38-1b45-277f-072f900acbc1&limit=500');
    const data = await response.json();

    console.log('✓ Camp 2 Room Count:', data.data ? data.data.length : 0);
    console.log('  Expected: 179');
    console.log();

    if (data.data && data.data.length > 0) {
      const firstRoom = data.data[0];
      console.log('✓ Sample Room:', firstRoom.room_number, '-', firstRoom.block?.code);

      if (firstRoom.current_month) {
        console.log('✓ Current Month:', firstRoom.current_month.month_name, firstRoom.current_month.year);
        console.log('✓ Has contract_start_date:', firstRoom.current_month.contract_start_date !== null && firstRoom.current_month.contract_start_date !== undefined);
        console.log('✓ Has contract_end_date:', firstRoom.current_month.contract_end_date !== null && firstRoom.current_month.contract_end_date !== undefined);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCamp2();
