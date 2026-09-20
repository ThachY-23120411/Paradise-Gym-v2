-- Migration 011: Chống trùng lịch HLV và Hội viên trong cùng khung giờ
-- Bắt buộc: 1 HLV hoặc 1 Hội viên chỉ có tối đa 1 lịch tập tại một thời điểm bắt đầu trong ngày (trừ trạng thái CANCELLED)

CREATE UNIQUE INDEX IF NOT EXISTS uq_pt_bookings_pt_slot
ON pt_bookings(pt_id, booking_date, start_time)
WHERE status <> 'CANCELLED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_pt_bookings_member_slot
ON pt_bookings(member_id, booking_date, start_time)
WHERE status <> 'CANCELLED';
