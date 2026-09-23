-- Migration 016: Community Class Disciplines and Instructor Bonus Amount

-- 1. Create class_disciplines table
CREATE TABLE IF NOT EXISTS class_disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_duration_minutes INTEGER NOT NULL DEFAULT 60,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add columns to community_classes
ALTER TABLE community_classes
    ADD COLUMN IF NOT EXISTS discipline_id UUID NULL REFERENCES class_disciplines(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS instructor_id UUID NULL REFERENCES pt_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_community_classes_discipline ON community_classes (discipline_id);
CREATE INDEX IF NOT EXISTS idx_community_classes_instructor ON community_classes (instructor_id);

-- 3. Seed default disciplines
INSERT INTO class_disciplines (id, name, description, base_price, max_duration_minutes, status)
VALUES
    ('85000000-0000-0000-0000-000000000001', 'Yoga', 'Lớp tập Yoga cân bằng tâm trí, tăng độ dẻo dai và hơi thở', 250000.00, 60, 'ACTIVE'),
    ('85000000-0000-0000-0000-000000000002', 'Zumba Dance', 'Lớp nhảy Zumba sôi động đốt cháy calo theo nhịp điệu Latin', 200000.00, 60, 'ACTIVE'),
    ('85000000-0000-0000-0000-000000000003', 'BodyPump', 'Lớp tập tạ nhóm rèn luyện sức bền và săn chắc cơ bắp toàn thân', 300000.00, 60, 'ACTIVE'),
    ('85000000-0000-0000-0000-000000000004', 'Pilates Core', 'Lớp kiểm soát hơi thở và tăng cường cơ lõi core chuyên sâu', 350000.00, 60, 'ACTIVE'),
    ('85000000-0000-0000-0000-000000000005', 'Cycling / RPM', 'Lớp đạp xe theo nhịp điệu âm nhạc tăng sức bền tim mạch', 220000.00, 45, 'ACTIVE'),
    ('85000000-0000-0000-0000-000000000006', 'Boxing Group', 'Lớp rèn luyện phản xạ và đòn đấm đối kháng nhóm', 280000.00, 60, 'ACTIVE'),
    ('85000000-0000-0000-0000-000000000007', 'Cardio HIIT', 'Bài tập chuỗi Cardio cường độ cao giúp kích hoạt trao đổi chất', 250000.00, 60, 'ACTIVE'),
    ('85000000-0000-0000-0000-000000000008', 'Aerobic', 'Vũ điệu Aerobic sôi động trên nền nhạc remix hiện đại', 200000.00, 60, 'ACTIVE')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    max_duration_minutes = EXCLUDED.max_duration_minutes;

-- 4. Backfill existing community_classes with discipline_id and base_price
UPDATE community_classes
SET discipline_id = d.id, base_price = d.base_price
FROM class_disciplines d
WHERE community_classes.discipline_id IS NULL
  AND (
    (community_classes.title ILIKE '%yoga%' AND d.name = 'Yoga') OR
    (community_classes.title ILIKE '%zumba%' AND d.name = 'Zumba Dance') OR
    (community_classes.title ILIKE '%cardio%' AND d.name = 'Cardio HIIT') OR
    (community_classes.title ILIKE '%aerobic%' AND d.name = 'Aerobic') OR
    (community_classes.title ILIKE '%bodypump%' AND d.name = 'BodyPump') OR
    (community_classes.title ILIKE '%pilates%' AND d.name = 'Pilates Core')
  );
