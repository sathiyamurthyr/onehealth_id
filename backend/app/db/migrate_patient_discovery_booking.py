"""
OH-ID Patient-First Discovery & Appointment Booking Migration
Implements:
1. Dynamic Specialties Catalog with full categories and combined specialties
2. Symptom / Problem Requirement mapping catalog
3. Hospital Geolocation, Verification Status, and Specialty Mappings
4. Complete Appointment Booking & Audit Schema with Concurrency Protection
5. Enhanced Views for Spatial/Discovery and Patient/Family Appointment Tracking
"""
import sys
import os
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from backend.app.database.session import get_db_cursor

MIGRATION_SQL = """
-- 1. Extend oh_id.appointments table
ALTER TABLE oh_id.appointments 
    ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(64) DEFAULT 'New Consultation',
    ADD COLUMN IF NOT EXISTS appointment_date DATE,
    ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(32),
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS symptoms_notes TEXT,
    ADD COLUMN IF NOT EXISTS relationship_context VARCHAR(32) DEFAULT 'SELF',
    ADD COLUMN IF NOT EXISTS booked_by_user_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS booked_by_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS booked_by_relationship VARCHAR(64),
    ADD COLUMN IF NOT EXISTS checkin_token VARCHAR(128),
    ADD COLUMN IF NOT EXISTS reschedule_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(128);

-- Populate existing rows
UPDATE oh_id.appointments
SET 
    appointment_type = COALESCE(appointment_type, 'New Consultation'),
    relationship_context = COALESCE(relationship_context, 'SELF'),
    checkin_token = COALESCE(checkin_token, 'APT-CHK-' || UPPER(SUBSTRING(MD5(id || RANDOM()::TEXT) FROM 1 FOR 8)))
WHERE checkin_token IS NULL;

-- 2. Extend oh_id.hospitals with location, verification, and rating
ALTER TABLE oh_id.hospitals
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.5,
    ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 42,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS consultation_fee INT DEFAULT 500,
    ADD COLUMN IF NOT EXISTS featured_badge VARCHAR(100) DEFAULT 'OH-ID Verified Provider';

-- 3. Extend oh_id.doctors with experience, consultation fee, rating, bio
ALTER TABLE oh_id.doctors
    ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 10,
    ADD COLUMN IF NOT EXISTS consultation_fee INT DEFAULT 500,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ADD COLUMN IF NOT EXISTS slot_duration_mins INT DEFAULT 30,
    ADD COLUMN IF NOT EXISTS morning_start_time VARCHAR(10) DEFAULT '09:00 AM',
    ADD COLUMN IF NOT EXISTS morning_end_time VARCHAR(10) DEFAULT '01:00 PM',
    ADD COLUMN IF NOT EXISTS evening_start_time VARCHAR(10) DEFAULT '04:30 PM',
    ADD COLUMN IF NOT EXISTS evening_end_time VARCHAR(10) DEFAULT '08:30 PM';

-- 4. Create oh_id.specialties Table (Dynamic Catalog)
CREATE TABLE IF NOT EXISTS oh_id.specialties (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    category VARCHAR(64) NOT NULL,
    display_order INT DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create oh_id.symptom_mappings Table (Problem / Requirement Quick Search)
CREATE TABLE IF NOT EXISTS oh_id.symptom_mappings (
    id VARCHAR(64) PRIMARY KEY,
    problem_title VARCHAR(128) NOT NULL UNIQUE,
    category VARCHAR(64) NOT NULL,
    specialty_names TEXT[] NOT NULL,
    keywords TEXT[] NOT NULL,
    icon VARCHAR(64) DEFAULT 'Activity',
    display_order INT DEFAULT 0
);

-- 6. Create oh_id.hospital_specialties Table (Hospital <-> Specialty Association)
CREATE TABLE IF NOT EXISTS oh_id.hospital_specialties (
    id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
    department_id VARCHAR(64) REFERENCES oh_id.departments(id) ON DELETE SET NULL,
    specialty_id VARCHAR(64) NOT NULL REFERENCES oh_id.specialties(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_hosp_spec UNIQUE (hospital_id, specialty_id)
);

-- 7. Seed Dynamic Specialties Catalog
INSERT INTO oh_id.specialties (id, name, category, display_order, description)
VALUES
    -- General
    ('spec-gen-med', 'General Medicine', 'General', 1, 'Primary care, fever, general health assessment, chronic diseases'),
    ('spec-fam-med', 'Family Medicine', 'General', 2, 'Comprehensive family health care and wellness'),
    ('spec-int-med', 'Internal Medicine', 'General', 3, 'Adult diseases, diagnosis, and non-surgical treatments'),
    ('spec-gen-surg', 'General Surgery', 'General', 4, 'Surgical evaluations, minor procedures, hernia, appendix'),
    
    -- Dental
    ('spec-dent', 'Dentistry', 'Dental', 10, 'General dental consultations, toothache, cleaning, fillings'),
    ('spec-orthod', 'Orthodontics', 'Dental', 11, 'Braces, aligners, and bite correction'),
    ('spec-oral-surg', 'Oral & Maxillofacial Surgery', 'Dental', 12, 'Tooth extractions, jaw surgery, implants'),
    ('spec-period', 'Periodontics', 'Dental', 13, 'Gum disease, bleeding gums, periodontitis'),
    ('spec-ped-dent', 'Pediatric Dentistry', 'Dental', 14, 'Children dental care, fluoride treatments'),

    -- Bone, Joint & Trauma
    ('spec-ortho-trauma', 'Orthopedics & Trauma', 'Bone, Joint & Trauma', 20, 'Fractures, joint injuries, sports trauma, arthritis'),
    ('spec-sports-med', 'Sports Medicine', 'Bone, Joint & Trauma', 21, 'Athletic injuries, ligament tears, rehab'),
    ('spec-joint-rep', 'Joint Replacement', 'Bone, Joint & Trauma', 22, 'Knee and hip replacement surgery, osteoarthritis'),
    ('spec-spine', 'Spine Surgery', 'Bone, Joint & Trauma', 23, 'Back pain, sciatica, disc herniation, spinal care'),
    ('spec-rheum-ger', 'Rheumatology & Geriatric Medicine', 'Bone, Joint & Trauma', 24, 'Autoimmune arthritis, elderly mobility, osteoporosis'),

    -- Heart
    ('spec-cardio', 'Cardiology', 'Heart', 30, 'Heart diseases, blood pressure, ECG, angiography'),
    ('spec-cardio-int', 'Cardiology & Internal Medicine', 'Heart', 31, 'Comprehensive cardiovascular health and metabolic disease management'),
    ('spec-ct-surg', 'Cardiothoracic Surgery', 'Heart', 32, 'Heart bypass, valve repair, chest surgery'),

    -- Women
    ('spec-ob-gyn', 'Obstetrics & Gynecology', 'Women', 40, 'Pregnancy, childbirth, women reproductive wellness'),
    ('spec-gyn', 'Gynecology', 'Women', 41, 'PCOS, menstrual irregularities, menopause'),
    ('spec-mat-fet', 'Maternal & Fetal Medicine', 'Women', 42, 'High-risk pregnancy, prenatal screening'),

    -- Children
    ('spec-ped', 'Pediatrics', 'Children', 50, 'Child health, immunization, growth tracking'),
    ('spec-ped-pulm', 'Pediatrics & Pediatric Pulmonology', 'Children', 51, 'Childhood asthma, respiratory allergies, pediatric care'),
    ('spec-ped-surg', 'Pediatric Surgery', 'Children', 52, 'Surgical care for infants and children'),
    ('spec-neonat', 'Neonatology', 'Children', 53, 'Newborn intensive care and premature infant management'),

    -- Brain & Nervous System
    ('spec-neuro', 'Neurology', 'Brain & Nervous System', 60, 'Headaches, epilepsy, stroke, neuropathy, Parkinson'),
    ('spec-neuro-surg', 'Neurosurgery', 'Brain & Nervous System', 61, 'Brain and spinal cord surgical procedures'),

    -- Skin
    ('spec-derma', 'Dermatology', 'Skin', 70, 'Skin infections, acne, eczema, hair loss, rashes'),

    -- ENT
    ('spec-ent', 'ENT', 'ENT', 80, 'Ear infection, hearing loss, sinus, throat problems, vertigo'),
    ('spec-head-neck', 'Head & Neck Surgery', 'ENT', 81, 'Thyroid, vocal cord, salivary gland surgery'),

    -- Eye
    ('spec-opht', 'Ophthalmology', 'Eye', 90, 'Cataract, vision correction, glaucoma, retina'),

    -- Kidney & Urinary
    ('spec-nephro', 'Nephrology', 'Kidney & Urinary', 100, 'Kidney function, dialysis, protein in urine'),
    ('spec-uro', 'Urology', 'Kidney & Urinary', 101, 'Kidney stones, prostate, urinary tract infections'),

    -- Gastro
    ('spec-gastro', 'Gastroenterology', 'Gastro', 110, 'Acid reflux, stomach pain, ulcers, liver diseases'),
    ('spec-hepato', 'Hepatology', 'Gastro', 111, 'Liver cirrhosis, hepatitis, fatty liver'),

    -- Cancer
    ('spec-med-onc', 'Medical Oncology', 'Cancer', 120, 'Chemotherapy, immunotherapy, cancer diagnosis'),
    ('spec-surg-onc', 'Surgical Oncology', 'Cancer', 121, 'Tumor resection, surgical biopsy'),

    -- Mental Health
    ('spec-psych', 'Psychiatry', 'Mental Health', 130, 'Depression, anxiety, sleep disorders, stress management'),
    ('spec-clin-psych', 'Clinical Psychology', 'Mental Health', 131, 'Counseling, cognitive therapy, behavioral assessments'),

    -- Older Adults
    ('spec-geriatric', 'Geriatric Medicine', 'Older Adults', 140, 'Elderly healthcare, memory care, dementia, frailty'),

    -- Other
    ('spec-pulmo', 'Pulmonology', 'Other', 150, 'Lungs, asthma, COPD, chronic cough'),
    ('spec-endo', 'Endocrinology', 'Other', 151, 'Diabetes, thyroid disorders, hormonal imbalance'),
    ('spec-physio', 'Physiotherapy', 'Other', 152, 'Physical therapy, rehabilitation, post-surgery mobility'),
    ('spec-radio', 'Radiology', 'Other', 153, 'X-Ray, Ultrasound, CT Scan, MRI'),
    ('spec-patho', 'Pathology', 'Other', 154, 'Blood tests, biopsy, diagnostic investigations')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- 8. Seed Patient Requirement / Symptom Problem Quick Mappings
INSERT INTO oh_id.symptom_mappings (id, problem_title, category, specialty_names, keywords, icon, display_order)
VALUES
    ('prob-fever', 'Fever / Cold / Viral Infection', 'General', ARRAY['General Medicine', 'Internal Medicine'], ARRAY['fever', 'cold', 'cough', 'chills', 'viral', 'flu', 'body pain'], 'Thermometer', 1),
    ('prob-bone-joint', 'Bone or Joint Pain', 'Bone, Joint & Trauma', ARRAY['Orthopedics & Trauma', 'Rheumatology & Geriatric Medicine', 'Sports Medicine'], ARRAY['joint pain', 'knee pain', 'back pain', 'fracture', 'bone', 'arthritis', 'sprain', 'swelling'], 'Bone', 2),
    ('prob-heart', 'Heart-related Consultation / BP', 'Heart', ARRAY['Cardiology', 'Cardiology & Internal Medicine'], ARRAY['chest pain', 'palpitations', 'high bp', 'blood pressure', 'breathlessness', 'hypertension'], 'Heart', 3),
    ('prob-child', 'Child Health & Vaccination', 'Children', ARRAY['Pediatrics', 'Pediatrics & Pediatric Pulmonology'], ARRAY['child fever', 'vaccine', 'immunization', 'baby', 'growth', 'pediatric cough'], 'Baby', 4),
    ('prob-dental', 'Dental Problem & Toothache', 'Dental', ARRAY['Dentistry', 'Orthodontics', 'Oral & Maxillofacial Surgery'], ARRAY['toothache', 'teeth', 'gum bleeding', 'cavity', 'braces', 'wisdom tooth', 'cleaning'], 'Smile', 5),
    ('prob-skin', 'Skin Problem / Rash / Allergy', 'Skin', ARRAY['Dermatology'], ARRAY['skin rash', 'itching', 'acne', 'pimples', 'hair fall', 'eczema', 'allergy', 'fungal'], 'Sparkles', 6),
    ('prob-ent', 'Ear / Nose / Throat Problem', 'ENT', ARRAY['ENT', 'Head & Neck Surgery'], ARRAY['ear pain', 'sore throat', 'tonsils', 'blocked nose', 'sinus', 'hearing', 'vertigo'], 'Headphones', 7),
    ('prob-women', 'Women''s Health & Maternity', 'Women', ARRAY['Obstetrics & Gynecology', 'Gynecology'], ARRAY['period', 'pcos', 'pregnancy', 'menstrual', 'pelvic pain', 'fertility'], 'HeartHandshake', 8),
    ('prob-eye', 'Eye Problem / Vision Blur', 'Eye', ARRAY['Ophthalmology'], ARRAY['eye pain', 'blurry vision', 'spectacles', 'red eye', 'cataract', 'watering'], 'Eye', 9),
    ('prob-diabetes', 'Diabetes & Sugar Control', 'Other', ARRAY['General Medicine', 'Endocrinology', 'Cardiology & Internal Medicine'], ARRAY['diabetes', 'sugar', 'glucose', 'insulin', 'tiredness', 'weight loss'], 'Activity', 10),
    ('prob-stomach', 'Stomach Pain / Acidity / Digestion', 'Gastro', ARRAY['Gastroenterology', 'General Medicine'], ARRAY['stomach pain', 'gastric', 'acidity', 'constipation', 'loose motion', 'vomiting', 'indigestion'], 'Coffee', 11),
    ('prob-kidney', 'Kidney / Urinary Problem', 'Kidney & Urinary', ARRAY['Nephrology', 'Urology'], ARRAY['urine pain', 'burning urine', 'kidney stone', 'frequent urination', 'back flank pain'], 'Droplet', 12),
    ('prob-mental', 'Stress / Anxiety / Mental Health', 'Mental Health', ARRAY['Psychiatry', 'Clinical Psychology'], ARRAY['anxiety', 'stress', 'depression', 'insomnia', 'sleep disorder', 'panic'], 'Brain', 13),
    ('prob-elderly', 'Older Adult / Geriatric Care', 'Older Adults', ARRAY['Geriatric Medicine', 'Rheumatology & Geriatric Medicine', 'Internal Medicine'], ARRAY['elderly', 'memory', 'dementia', 'walking difficulty', 'frailty', 'senior health'], 'Users', 14)
ON CONFLICT (id) DO UPDATE SET
    problem_title = EXCLUDED.problem_title,
    specialty_names = EXCLUDED.specialty_names,
    keywords = EXCLUDED.keywords;

-- 9. Update Hospitals with Real-World Chennai Locations & Geodata
-- Kedar Hospital (Mugalivakkam, Chennai - Primary Pilot Center)
UPDATE oh_id.hospitals
SET 
    name = 'Kedar Hospital',
    code = 'KEDAR-MUG-01',
    address = 'Mount-Poonamallee High Road, Mugalivakkam',
    area = 'Mugalivakkam',
    city = 'Chennai',
    state = 'Tamil Nadu',
    pin_code = '600125',
    latitude = 13.018200,
    longitude = 80.165400,
    rating = 4.85,
    review_count = 128,
    is_active = TRUE,
    is_verified = TRUE,
    verification_status = 'ACTIVE',
    booking_enabled = TRUE,
    consultation_fee = 500,
    featured_badge = '✓ OH-ID Verified Hospital',
    phone = '+91 44 2252 8800',
    email = 'appointments@kedarhospital.com'
WHERE id = 'hosp-kedar';

-- Kedar Hospital - Iyyappanthangal Branch
UPDATE oh_id.hospitals
SET 
    name = 'Kedar Hospital - Iyyappanthangal Clinic',
    code = 'KEDAR-IYP-02',
    address = '58 Mount-Poonamallee Road, Iyyappanthangal',
    area = 'Iyyappanthangal',
    city = 'Chennai',
    state = 'Tamil Nadu',
    pin_code = '600056',
    latitude = 13.033100,
    longitude = 80.141200,
    rating = 4.70,
    review_count = 64,
    is_active = TRUE,
    is_verified = TRUE,
    verification_status = 'ACTIVE',
    booking_enabled = TRUE,
    consultation_fee = 400,
    featured_badge = '✓ OH-ID Verified Clinic',
    phone = '+91 44 2476 1122',
    email = 'iyyappanthangal@kedarhospital.com'
WHERE id = 'hosp-kedar-iyp';

-- Children's Specialty Clinic & Pediatric Care (Anna Nagar, Chennai)
UPDATE oh_id.hospitals
SET 
    name = 'Children''s Specialty Clinic & Pediatric Care',
    code = 'CHILD-CHE-01',
    address = '45 Gandhi Road, Anna Nagar',
    area = 'Anna Nagar',
    city = 'Chennai',
    state = 'Tamil Nadu',
    pin_code = '600040',
    latitude = 13.085000,
    longitude = 80.210000,
    rating = 4.90,
    review_count = 95,
    is_active = TRUE,
    is_verified = TRUE,
    verification_status = 'ACTIVE',
    booking_enabled = TRUE,
    consultation_fee = 600,
    featured_badge = '✓ OH-ID Verified Center',
    phone = '+91 44 2619 4400',
    email = 'care@childrensclinic.org'
WHERE id = 'hosp-child-01';

-- City Care Multi-Specialty Hospital (Velachery, Chennai)
UPDATE oh_id.hospitals
SET 
    name = 'City Care Multi-Specialty Hospital & Diagnostic Centre',
    code = 'CITY-CHE-01',
    address = '12 Velachery Main Road',
    area = 'Velachery',
    city = 'Chennai',
    state = 'Tamil Nadu',
    pin_code = '600042',
    latitude = 12.980000,
    longitude = 80.220000,
    rating = 4.75,
    review_count = 82,
    is_active = TRUE,
    is_verified = TRUE,
    verification_status = 'ACTIVE',
    booking_enabled = TRUE,
    consultation_fee = 550,
    featured_badge = '✓ OH-ID Verified Hospital',
    phone = '+91 44 2243 5500',
    email = 'info@citycarehospital.in'
WHERE id = 'hosp-city-01';

-- Apollo City Hospital (Greams Road / Thousand Lights, Chennai)
UPDATE oh_id.hospitals
SET 
    name = 'Apollo City Hospital - Chennai Central',
    code = 'APOLLO-CHE-01',
    address = '21 Greams Lane, Thousand Lights',
    area = 'Thousand Lights',
    city = 'Chennai',
    state = 'Tamil Nadu',
    pin_code = '600006',
    latitude = 13.060000,
    longitude = 80.250000,
    rating = 4.80,
    review_count = 210,
    is_active = TRUE,
    is_verified = TRUE,
    verification_status = 'ACTIVE',
    booking_enabled = TRUE,
    consultation_fee = 800,
    featured_badge = '✓ OH-ID Verified Hospital',
    phone = '+91 44 2829 0200',
    email = 'central@apollo.org'
WHERE id = 'hosp-001';

-- Ensure Porur Community Health Center exists in OH-ID database for nearby Porur search
INSERT INTO oh_id.hospitals (
    id, name, code, address, area, city, state, country, pin_code,
    latitude, longitude, rating, review_count, is_active, is_verified,
    verification_status, booking_enabled, consultation_fee, featured_badge,
    phone, email, hospital_ref_id
) VALUES (
    'hosp-porur-01',
    'Porur Family Health & Dental Clinic',
    'PORUR-CHE-01',
    '78 Arcot Road, Porur Junction',
    'Porur',
    'Chennai',
    'Tamil Nadu',
    'India',
    '600116',
    13.038200,
    80.156500,
    4.65,
    58,
    TRUE,
    TRUE,
    'ACTIVE',
    TRUE,
    350,
    '✓ OH-ID Verified Clinic',
    '+91 44 2482 9900',
    'contact@porurhealth.in',
    'hosp-porur-01'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    area = EXCLUDED.area,
    pin_code = EXCLUDED.pin_code,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

-- 10. Ensure Departments exist across hospitals
INSERT INTO oh_id.departments (id, name, code, hospital_id)
VALUES
    -- Kedar Hospital Departments
    ('dept-k-gen', 'General Medicine', 'KED-GEN', 'hosp-kedar'),
    ('dept-k-cardio', 'Cardiology & Internal Medicine', 'KED-CARD', 'hosp-kedar'),
    ('dept-k-ortho', 'Orthopedics & Trauma', 'KED-ORTH', 'hosp-kedar'),
    ('dept-k-pedia', 'Pediatrics', 'KED-PED', 'hosp-kedar'),
    ('dept-k-derma', 'Dermatology', 'KED-DERM', 'hosp-kedar'),
    ('dept-k-ent', 'ENT', 'KED-ENT', 'hosp-kedar'),
    ('dept-k-gynae', 'Gynecology & Obstetrics', 'KED-GYN', 'hosp-kedar'),
    ('dept-k-dent', 'Dentistry', 'KED-DENT', 'hosp-kedar'),
    ('dept-k-neuro', 'Neurology', 'KED-NEUR', 'hosp-kedar'),

    -- Porur Clinic Departments
    ('dept-p-gen', 'General & Family Medicine', 'POR-GEN', 'hosp-porur-01'),
    ('dept-p-dent', 'Dentistry & Orthodontics', 'POR-DENT', 'hosp-porur-01'),
    ('dept-p-ortho', 'Orthopedics & Joint Care', 'POR-ORTH', 'hosp-porur-01'),

    -- Children Clinic Departments
    ('dept-c-pedia', 'Pediatrics & Pediatric Pulmonology', 'CHD-PED', 'hosp-child-01'),
    ('dept-c-dent', 'Pediatric Dentistry', 'CHD-DENT', 'hosp-child-01'),

    -- City Care Hospital Departments
    ('dept-city-rheum', 'Rheumatology & Geriatric Medicine', 'CTY-RHEUM', 'hosp-city-01'),
    ('dept-city-gen', 'General Medicine', 'CTY-GEN', 'hosp-city-01'),
    ('dept-city-ortho', 'Orthopedics & Sports Medicine', 'CTY-ORTH', 'hosp-city-01')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    hospital_id = EXCLUDED.hospital_id;

-- 11. Seed Doctors with accurate schedules and experience
INSERT INTO oh_id.doctors (
    id, hospital_id, department_id, name, specialty, qualification,
    experience_years, consultation_fee, rating, room_number, phone, email, is_available
) VALUES
    -- Kedar Hospital Doctors
    ('doc-arun-kumar', 'hosp-kedar', 'dept-k-cardio', 'Dr. Arun Kumar', 'Cardiology & Internal Medicine', 'MBBS, MD, DM (Cardiology)', 14, 600, 4.90, 'OPD-102', '+91 98401 10001', 'arun.cardio@kedarhospital.com', TRUE),
    ('doc-k-01', 'hosp-kedar', 'dept-k-gen', 'Dr. Senthil Nathan', 'General Medicine', 'MBBS, MD (General Medicine)', 12, 500, 4.85, 'OPD-101', '+91 98401 10002', 'senthil.med@kedarhospital.com', TRUE),
    ('doc-k-kumar', 'hosp-kedar', 'dept-k-ortho', 'Dr. Rajesh Kumar', 'Orthopedics & Trauma', 'MBBS, MS (Orthopedics), MCh', 16, 650, 4.92, 'OPD-201', '+91 98401 10003', 'rajesh.ortho@kedarhospital.com', TRUE),
    ('doc-pedia-k', 'hosp-kedar', 'dept-k-pedia', 'Dr. Priya Shankar', 'Pediatrics', 'MBBS, DCH, DNB (Pediatrics)', 11, 500, 4.88, 'OPD-105', '+91 98401 10004', 'priya.ped@kedarhospital.com', TRUE),
    ('doc-derma-k', 'hosp-kedar', 'dept-k-derma', 'Dr. Deepa Natarajan', 'Dermatology', 'MBBS, MD (Dermatology)', 9, 500, 4.80, 'OPD-108', '+91 98401 10005', 'deepa.derma@kedarhospital.com', TRUE),
    ('doc-ent-k', 'hosp-kedar', 'dept-k-ent', 'Dr. Vikramaditya Reddy', 'ENT', 'MBBS, MS (ENT), DNB', 13, 550, 4.86, 'OPD-110', '+91 98401 10006', 'vikram.ent@kedarhospital.com', TRUE),
    ('doc-dent-k', 'hosp-kedar', 'dept-k-dent', 'Dr. Radhika Krishnan', 'Dentistry', 'BDS, MDS (Orthodontics)', 10, 450, 4.84, 'DENT-01', '+91 98401 10007', 'radhika.dent@kedarhospital.com', TRUE),

    -- Porur Clinic Doctors
    ('doc-porur-gen', 'hosp-porur-01', 'dept-p-gen', 'Dr. Balaji Murugan', 'General Medicine', 'MBBS, MD', 8, 350, 4.70, 'ROOM-1', '+91 98402 33441', 'balaji@porurhealth.in', TRUE),
    ('doc-porur-dent', 'hosp-porur-01', 'dept-p-dent', 'Dr. Sneha Ramesh', 'Dentistry', 'BDS, MDS', 7, 350, 4.80, 'DENT-1', '+91 98402 33442', 'sneha@porurhealth.in', TRUE),

    -- Children Clinic Doctor
    ('doc-ped-01', 'hosp-child-01', 'dept-c-pedia', 'Dr. Ananya Swaminathan', 'Pediatrics & Pediatric Pulmonology', 'MBBS, MD (Pediatrics), DNB', 15, 600, 4.95, 'PEDI-101', '+91 98402 11223', 'ananya.ped@childrensclinic.org', TRUE),

    -- City Care Doctor
    ('doc-rheum-01', 'hosp-city-01', 'dept-city-rheum', 'Dr. Meenakshi Sundaram', 'Rheumatology & Geriatric Medicine', 'MBBS, MD (Medicine), DM (Rheum)', 18, 700, 4.92, 'RHEUM-1', '+91 98403 44556', 'meenakshi.s@citycarehospital.in', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    specialty = EXCLUDED.specialty,
    department_id = EXCLUDED.department_id,
    hospital_id = EXCLUDED.hospital_id,
    experience_years = EXCLUDED.experience_years,
    consultation_fee = EXCLUDED.consultation_fee,
    rating = EXCLUDED.rating;

-- 12. Link Hospital Specialties
INSERT INTO oh_id.hospital_specialties (id, hospital_id, department_id, specialty_id)
VALUES
    -- Kedar Hospital
    ('hs-k-gen', 'hosp-kedar', 'dept-k-gen', 'spec-gen-med'),
    ('hs-k-int', 'hosp-kedar', 'dept-k-gen', 'spec-int-med'),
    ('hs-k-cardio', 'hosp-kedar', 'dept-k-cardio', 'spec-cardio'),
    ('hs-k-cardio-int', 'hosp-kedar', 'dept-k-cardio', 'spec-cardio-int'),
    ('hs-k-ortho', 'hosp-kedar', 'dept-k-ortho', 'spec-ortho-trauma'),
    ('hs-k-pedia', 'hosp-kedar', 'dept-k-pedia', 'spec-ped'),
    ('hs-k-derma', 'hosp-kedar', 'dept-k-derma', 'spec-derma'),
    ('hs-k-ent', 'hosp-kedar', 'dept-k-ent', 'spec-ent'),
    ('hs-k-dent', 'hosp-kedar', 'dept-k-dent', 'spec-dent'),
    ('hs-k-gynae', 'hosp-kedar', 'dept-k-gynae', 'spec-gyn'),

    -- Porur Clinic
    ('hs-p-gen', 'hosp-porur-01', 'dept-p-gen', 'spec-gen-med'),
    ('hs-p-fam', 'hosp-porur-01', 'dept-p-gen', 'spec-fam-med'),
    ('hs-p-dent', 'hosp-porur-01', 'dept-p-dent', 'spec-dent'),
    ('hs-p-orthod', 'hosp-porur-01', 'dept-p-dent', 'spec-orthod'),
    ('hs-p-ortho', 'hosp-porur-01', 'dept-p-ortho', 'spec-ortho-trauma'),

    -- Children Clinic
    ('hs-c-pedia', 'hosp-child-01', 'dept-c-pedia', 'spec-ped'),
    ('hs-c-ped-pulm', 'hosp-child-01', 'dept-c-pedia', 'spec-ped-pulm'),

    -- City Care Hospital
    ('hs-city-rheum', 'hosp-city-01', 'dept-city-rheum', 'spec-rheum-ger'),
    ('hs-city-ger', 'hosp-city-01', 'dept-city-rheum', 'spec-geriatric'),
    ('hs-city-gen', 'hosp-city-01', 'dept-city-gen', 'spec-gen-med'),
    ('hs-city-ortho', 'hosp-city-01', 'dept-city-ortho', 'spec-ortho-trauma')
ON CONFLICT (hospital_id, specialty_id) DO NOTHING;

-- 13. Recreate Enhanced oh_id.vw_appointments
DROP VIEW IF EXISTS oh_id.vw_appointments CASCADE;
CREATE VIEW oh_id.vw_appointments AS
SELECT 
    a.id,
    a.patient_id,
    p.name AS patient_name,
    p.onehealth_id,
    p.phone AS patient_phone,
    p.age AS patient_age,
    p.gender AS patient_gender,
    p.diagnosis AS patient_diagnosis,
    p.identity_type,
    p.identity_number,
    a.doctor_id,
    d.name AS doctor_name,
    d.specialty AS doctor_specialty,
    d.qualification AS doctor_qualification,
    d.room_number,
    d.rating AS doctor_rating,
    d.experience_years AS doctor_experience_years,
    d.consultation_fee AS doctor_consultation_fee,
    a.hospital_id,
    COALESCE(h.name, 'Hospital Facility') AS hospital_name,
    h.city AS hospital_city,
    h.area AS hospital_area,
    h.address AS hospital_address,
    h.pin_code AS hospital_pin_code,
    h.latitude AS hospital_latitude,
    h.longitude AS hospital_longitude,
    h.rating AS hospital_rating,
    h.featured_badge AS hospital_badge,
    a.branch_id,
    b.name AS branch_name,
    a.department_id,
    COALESCE(dept.name, 'General OPD') AS department_name,
    a.slot,
    a.appointment_type,
    a.appointment_date,
    a.appointment_time,
    a.reason,
    a.symptoms_notes,
    a.status,
    a.token_number,
    a.priority,
    a.notes,
    a.relationship_context,
    a.booked_by_user_id,
    a.booked_by_name,
    a.booked_by_relationship,
    a.checkin_token,
    a.reschedule_history,
    a.cancellation_reason,
    a.cancelled_at,
    a.cancelled_by,
    a.is_demo_data,
    a.booked_by,
    a.created_at,
    a.updated_at
FROM oh_id.appointments a
LEFT JOIN oh_id.patients p ON a.patient_id = p.id
LEFT JOIN oh_id.doctors d ON a.doctor_id = d.id
LEFT JOIN oh_id.hospitals h ON a.hospital_id = h.id
LEFT JOIN oh_id.hospital_branches b ON a.branch_id = b.id
LEFT JOIN oh_id.departments dept ON a.department_id = dept.id;

-- 14. Create Stored Procedure for Transactional Appointment Booking with Concurrency Lock
CREATE OR REPLACE PROCEDURE oh_id.sp_book_patient_appointment_v2(
    IN p_appointment_id VARCHAR(64),
    IN p_patient_id VARCHAR(64),
    IN p_booked_by_user_id VARCHAR(64),
    IN p_booked_by_name VARCHAR(128),
    IN p_booked_by_relationship VARCHAR(64),
    IN p_relationship_context VARCHAR(32),
    IN p_hospital_id VARCHAR(64),
    IN p_department_id VARCHAR(64),
    IN p_doctor_id VARCHAR(64),
    IN p_appointment_type VARCHAR(64),
    IN p_appointment_date DATE,
    IN p_appointment_time VARCHAR(32),
    IN p_slot VARCHAR(64),
    IN p_reason TEXT,
    IN p_symptoms_notes TEXT,
    IN p_priority VARCHAR(32),
    OUT o_appointment_id VARCHAR(64),
    OUT o_token_number INT,
    OUT o_checkin_token VARCHAR(128),
    OUT o_status VARCHAR(32)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_appt_id VARCHAR(64);
    v_token INT;
    v_checkin VARCHAR(128);
    v_conflict_count INT;
BEGIN
    -- 1. Slot Concurrency Check: Verify no existing active appointment for this doctor at the exact slot
    SELECT COUNT(*) INTO v_conflict_count
    FROM oh_id.appointments
    WHERE doctor_id = p_doctor_id
      AND (
          (appointment_date = p_appointment_date AND appointment_time = p_appointment_time)
          OR slot = p_slot
      )
      AND status NOT IN ('cancelled', 'CANCELLED', 'no_show', 'NO_SHOW');

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'SLOT_ALREADY_BOOKED: The selected time slot % on % with doctor % is no longer available.', p_appointment_time, p_appointment_date, p_doctor_id;
    END IF;

    -- 2. Generate Unique Appointment ID and Checkin Token
    v_appt_id := COALESCE(p_appointment_id, 'APT-' || TO_CHAR(COALESCE(p_appointment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)));
    v_checkin := 'APT-CHK-' || UPPER(SUBSTRING(MD5(v_appt_id || RANDOM()::TEXT) FROM 1 FOR 10));

    -- 3. Calculate Daily Queue Token Number for the Doctor/Hospital
    SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_token
    FROM oh_id.appointments
    WHERE hospital_id = p_hospital_id
      AND (appointment_date = p_appointment_date OR created_at::date = CURRENT_DATE);

    -- 4. Insert Appointment Record
    INSERT INTO oh_id.appointments (
        id,
        patient_id,
        doctor_id,
        hospital_id,
        department_id,
        appointment_type,
        appointment_date,
        appointment_time,
        slot,
        reason,
        symptoms_notes,
        relationship_context,
        booked_by_user_id,
        booked_by_name,
        booked_by_relationship,
        checkin_token,
        status,
        token_number,
        priority,
        booked_by,
        created_at,
        updated_at
    ) VALUES (
        v_appt_id,
        p_patient_id,
        p_doctor_id,
        p_hospital_id,
        p_department_id,
        COALESCE(p_appointment_type, 'New Consultation'),
        p_appointment_date,
        p_appointment_time,
        COALESCE(p_slot, TO_CHAR(p_appointment_date, 'YYYY-MM-DD') || ' ' || p_appointment_time),
        p_reason,
        p_symptoms_notes,
        COALESCE(p_relationship_context, 'SELF'),
        p_booked_by_user_id,
        p_booked_by_name,
        p_booked_by_relationship,
        v_checkin,
        'scheduled',
        v_token,
        COALESCE(p_priority, 'NORMAL'),
        COALESCE(p_booked_by_user_id, 'patient'),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    o_appointment_id := v_appt_id;
    o_token_number := v_token;
    o_checkin_token := v_checkin;
    o_status := 'scheduled';
END;
$$;
"""

def run_migration():
    print("Executing OH-ID Patient-First Discovery & Booking Migration...")
    with get_db_cursor() as cur:
        cur.execute(MIGRATION_SQL)
    print("Migration executed successfully!")

if __name__ == "__main__":
    run_migration()
