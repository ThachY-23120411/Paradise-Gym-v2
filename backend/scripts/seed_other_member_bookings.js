const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/paradise_gym'
});

async function seedOthers() {
  const ptId = '50000000-0000-0000-0000-000000000001'; // Nguyễn Văn Thể (PT001)
  const memberId = '40000000-0000-0000-0000-000000000002'; // Trần Thị Bình (HV002)
  const branchId = '11111111-1111-1111-1111-111111111111';
  const regId = '88880001-0000-0000-0000-000000000008';

  const otherBookings = [
    { date: '2026-09-19', start: '10:00:00', end: '11:30:00', status: 'COMPLETED', num: 2 },
    { date: '2026-09-20', start: '16:30:00', end: '18:00:00', status: 'BOOKED', num: 3 },
    { date: '2026-09-21', start: '09:30:00', end: '11:00:00', status: 'BOOKED', num: 4 },
    { date: '2026-09-22', start: '14:00:00', end: '15:30:00', status: 'BOOKED', num: 5 }
  ];

  for (const item of otherBookings) {
    await pool.query(`
      INSERT INTO pt_bookings (
        branch_id, pt_id, member_id, registration_id,
        booking_date, start_time, end_time, session_number,
        status, pt_confirmed_at, member_confirmed_at, is_deducted,
        workout_notes, fitness_assessment, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5::date, $6::time, $7::time, $8::int,
        $9::varchar,
        CASE WHEN $9::text = 'COMPLETED' THEN ($5::text || ' ' || $7::text)::timestamptz ELSE NULL END,
        CASE WHEN $9::text = 'COMPLETED' THEN ($5::text || ' ' || $7::text)::timestamptz ELSE NULL END,
        CASE WHEN $9::text = 'COMPLETED' THEN TRUE ELSE FALSE END,
        'Tập luyện nâng cao thể lực', 'Tiến bộ tốt',
        NOW(), NOW()
      )
      ON CONFLICT (pt_id, booking_date, start_time) WHERE status <> 'CANCELLED' DO NOTHING;
    `, [branchId, ptId, memberId, regId, item.date, item.start, item.end, item.num, item.status]);
  }

  // Cập nhật số buổi của hợp đồng theo Rule 5
  await pool.query(`
    UPDATE registrations
    SET used_pt_sessions = 2,
        booked_pt_sessions = 3,
        remaining_pt_sessions = 7
    WHERE id = $1;
  `, [regId]);

  console.log('✅ Successfully seeded bookings for other members with PT001!');
  await pool.end();
}

seedOthers().catch(err => {
  console.error('❌ Error seeding other bookings:', err);
  pool.end();
});
