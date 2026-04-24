const { pool } = require('./index');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing tables
    await client.query(`
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS clinical_notes CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS recall_campaigns CASCADE;
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS insurance_claims CASCADE;
      DROP TABLE IF EXISTS treatment_plans CASCADE;
      DROP TABLE IF EXISTS xray_analyses CASCADE;
      DROP TABLE IF EXISTS patients CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'dentist',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create patients table
    await client.query(`
      CREATE TABLE patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        date_of_birth DATE,
        address TEXT,
        insurance_provider VARCHAR(255),
        insurance_id VARCHAR(100),
        medical_history TEXT,
        allergies TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create xray_analyses table
    await client.query(`
      CREATE TABLE xray_analyses (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        image_description TEXT NOT NULL,
        tooth_number VARCHAR(10),
        analysis_type VARCHAR(100),
        ai_findings TEXT,
        ai_annotations TEXT,
        severity VARCHAR(20) DEFAULT 'moderate',
        status VARCHAR(50) DEFAULT 'pending',
        dentist_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create treatment_plans table
    await client.query(`
      CREATE TABLE treatment_plans (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        diagnosis TEXT NOT NULL,
        treatment_description TEXT,
        ai_recommendation TEXT,
        procedures TEXT,
        estimated_cost DECIMAL(10,2),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'proposed',
        start_date DATE,
        end_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create insurance_claims table
    await client.query(`
      CREATE TABLE insurance_claims (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        treatment_plan_id INTEGER REFERENCES treatment_plans(id) ON DELETE SET NULL,
        insurance_provider VARCHAR(255) NOT NULL,
        policy_number VARCHAR(100),
        claim_amount DECIMAL(10,2),
        approved_amount DECIMAL(10,2),
        procedure_codes TEXT,
        ai_pre_auth_notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        submission_date DATE,
        response_date DATE,
        denial_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create appointments table
    await client.query(`
      CREATE TABLE appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        appointment_date TIMESTAMP NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        appointment_type VARCHAR(100),
        provider VARCHAR(255),
        operatory VARCHAR(50),
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create recall_campaigns table
    await client.query(`
      CREATE TABLE recall_campaigns (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        campaign_type VARCHAR(100) NOT NULL,
        recall_reason TEXT,
        due_date DATE,
        contact_method VARCHAR(50) DEFAULT 'email',
        message_template TEXT,
        ai_personalized_message TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        sent_date TIMESTAMP,
        response_received BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create invoices table
    await client.query(`
      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        items JSONB DEFAULT '[]',
        subtotal DECIMAL(10,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) DEFAULT 0,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'unpaid',
        due_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create payments table
    await client.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash',
        reference_number VARCHAR(100),
        payment_date TIMESTAMP DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create inventory table
    await client.query(`
      CREATE TABLE inventory (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        sku VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'units',
        unit_cost DECIMAL(10,2) DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        supplier VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create clinical_notes table
    await client.query(`
      CREATE TABLE clinical_notes (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        visit_date DATE NOT NULL,
        note_type VARCHAR(50) DEFAULT 'progress',
        chief_complaint TEXT,
        subjective TEXT,
        objective TEXT,
        assessment TEXT,
        plan TEXT,
        provider VARCHAR(255),
        tooth_numbers VARCHAR(100),
        procedures_performed TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed users (password is 'password123' bcrypt hashed)
    const hashedPassword = '$2a$10$upb/Yb5SYLR7u0VZ95Z4ZOJBlEG39/wG3BEElUoiHICn4Az0/Weia';
    await client.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('dr.smith@dentalcare.com', '${hashedPassword}', 'Dr. Sarah Smith', 'dentist'),
      ('dr.jones@dentalcare.com', '${hashedPassword}', 'Dr. Michael Jones', 'dentist'),
      ('admin@dentalcare.com', '${hashedPassword}', 'Admin User', 'admin'),
      ('hygienist@dentalcare.com', '${hashedPassword}', 'Lisa Chen', 'hygienist')
    `);

    // Seed 18 patients
    await client.query(`
      INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, address, insurance_provider, insurance_id, medical_history, allergies, notes) VALUES
      ('John', 'Anderson', 'john.anderson@email.com', '(555) 123-4567', '1985-03-15', '123 Oak Street, Springfield, IL 62701', 'Delta Dental', 'DD-78901', 'Hypertension, controlled with medication', 'Penicillin', 'Regular 6-month checkup patient'),
      ('Emily', 'Rodriguez', 'emily.r@email.com', '(555) 234-5678', '1992-07-22', '456 Maple Ave, Springfield, IL 62702', 'MetLife Dental', 'ML-34567', 'No significant medical history', 'None', 'Orthodontic treatment completed 2020'),
      ('Robert', 'Kim', 'robert.kim@email.com', '(555) 345-6789', '1978-11-08', '789 Pine Road, Springfield, IL 62703', 'Cigna Dental', 'CG-45678', 'Type 2 Diabetes', 'Latex, Codeine', 'Requires pre-medication for procedures'),
      ('Maria', 'Garcia', 'maria.g@email.com', '(555) 456-7890', '1988-01-30', '321 Elm Court, Springfield, IL 62704', 'Aetna Dental', 'AE-56789', 'Asthma', 'Sulfa drugs', 'Anxious patient, prefers sedation'),
      ('James', 'Wilson', 'james.w@email.com', '(555) 567-8901', '1965-09-12', '654 Birch Lane, Springfield, IL 62705', 'Delta Dental', 'DD-67890', 'Heart murmur, anticoagulant therapy', 'Aspirin', 'Requires antibiotic prophylaxis'),
      ('Sarah', 'Thompson', 'sarah.t@email.com', '(555) 678-9012', '1995-04-18', '987 Cedar Blvd, Springfield, IL 62706', 'Guardian Dental', 'GD-78901', 'Pregnant - 2nd trimester', 'None', 'Limit x-rays, no nitrous oxide'),
      ('David', 'Martinez', 'david.m@email.com', '(555) 789-0123', '1972-12-05', '147 Walnut St, Springfield, IL 62707', 'United Concordia', 'UC-89012', 'GERD, sleep apnea', 'Erythromycin', 'Uses CPAP machine, TMJ issues'),
      ('Jennifer', 'Brown', 'jen.brown@email.com', '(555) 890-1234', '1983-06-25', '258 Spruce Dr, Springfield, IL 62708', 'MetLife Dental', 'ML-90123', 'Rheumatoid arthritis', 'NSAIDs', 'Limited jaw opening'),
      ('Michael', 'Lee', 'michael.lee@email.com', '(555) 901-2345', '1990-02-14', '369 Ash Way, Springfield, IL 62709', 'Cigna Dental', 'CG-01234', 'No significant medical history', 'None', 'Excellent oral hygiene'),
      ('Amanda', 'Taylor', 'amanda.t@email.com', '(555) 012-3456', '1976-08-03', '741 Poplar Ct, Springfield, IL 62710', 'Aetna Dental', 'AE-12345', 'Osteoporosis, bisphosphonate therapy', 'Ibuprofen', 'Caution with extractions - BRONJ risk'),
      ('Christopher', 'White', 'chris.w@email.com', '(555) 111-2222', '1969-05-20', '852 Hickory Ln, Springfield, IL 62711', 'Delta Dental', 'DD-23456', 'Epilepsy, controlled', 'Phenytoin', 'Gingival hyperplasia from medication'),
      ('Jessica', 'Harris', 'jessica.h@email.com', '(555) 222-3333', '1998-10-11', '963 Sycamore Rd, Springfield, IL 62712', 'Guardian Dental', 'GD-34567', 'No significant medical history', 'None', 'Wisdom teeth monitoring'),
      ('William', 'Clark', 'william.c@email.com', '(555) 333-4444', '1955-07-28', '174 Redwood Ave, Springfield, IL 62713', 'Medicare Dental', 'MC-45678', 'COPD, pacemaker', 'Clindamycin', 'Avoid ultrasonic scalers'),
      ('Ashley', 'Lewis', 'ashley.l@email.com', '(555) 444-5555', '1987-03-09', '285 Cypress St, Springfield, IL 62714', 'United Concordia', 'UC-56789', 'Anxiety disorder', 'None', 'Nitrous oxide for all procedures'),
      ('Daniel', 'Walker', 'daniel.w@email.com', '(555) 555-6666', '1981-11-17', '396 Magnolia Blvd, Springfield, IL 62715', 'MetLife Dental', 'ML-67890', 'Hemophilia A', 'None', 'Factor replacement before surgery'),
      ('Nicole', 'Hall', 'nicole.h@email.com', '(555) 666-7777', '1993-08-24', '407 Dogwood Dr, Springfield, IL 62716', 'Cigna Dental', 'CG-78901', 'Celiac disease', 'Gluten (oral products)', 'Use gluten-free dental products'),
      ('Matthew', 'Young', 'matthew.y@email.com', '(555) 777-8888', '1974-01-06', '518 Chestnut Way, Springfield, IL 62717', 'Aetna Dental', 'AE-89012', 'HIV positive, well-controlled', 'Abacavir', 'Standard precautions, regular perio care'),
      ('Lauren', 'King', 'lauren.k@email.com', '(555) 888-9999', '1986-06-13', '629 Willow Ct, Springfield, IL 62718', 'Delta Dental', 'DD-90123', 'Hypothyroidism', 'None', 'Dry mouth symptoms, high caries risk')
    `);

    // Seed 18 X-ray analyses
    await client.query(`
      INSERT INTO xray_analyses (patient_id, image_description, tooth_number, analysis_type, ai_findings, ai_annotations, severity, status, dentist_notes) VALUES
      (1, 'Periapical radiograph of upper right quadrant', '14', 'Periapical', 'Radiolucency detected at apex of tooth #14 suggesting periapical pathology. Possible abscess formation.', '{"annotations": [{"area": "apex_14", "finding": "periapical_radiolucency", "confidence": 0.92}]}', 'high', 'reviewed', 'Root canal treatment recommended'),
      (2, 'Bitewing radiograph left side', '18-19', 'Bitewing', 'Interproximal caries detected between teeth #18 and #19. Early enamel involvement only.', '{"annotations": [{"area": "interproximal_18_19", "finding": "early_caries", "confidence": 0.88}]}', 'low', 'reviewed', 'Monitor at next visit, fluoride varnish applied'),
      (3, 'Panoramic radiograph full mouth', 'Full', 'Panoramic', 'Generalized moderate bone loss consistent with chronic periodontitis. Furcation involvement on tooth #30.', '{"annotations": [{"area": "full_mouth", "finding": "periodontal_bone_loss", "confidence": 0.95}]}', 'high', 'reviewed', 'Periodontal referral recommended'),
      (4, 'Periapical radiograph lower left', '20', 'Periapical', 'Large radiolucent area on distal of tooth #20. Caries extending to pulp chamber.', '{"annotations": [{"area": "distal_20", "finding": "deep_caries", "confidence": 0.94}]}', 'high', 'pending', 'Evaluate for crown vs extraction'),
      (5, 'Bitewing radiograph right side', '3-4', 'Bitewing', 'Recurrent caries detected under existing amalgam restoration on tooth #3.', '{"annotations": [{"area": "mesial_3", "finding": "recurrent_caries", "confidence": 0.87}]}', 'moderate', 'reviewed', 'Replace restoration with ceramic crown'),
      (6, 'Periapical radiograph upper anterior', '8-9', 'Periapical', 'No pathology detected. Normal periapical structures and bone levels.', '{"annotations": [{"area": "anterior_8_9", "finding": "normal", "confidence": 0.96}]}', 'low', 'completed', 'Normal findings, routine follow-up'),
      (7, 'Panoramic radiograph', 'Full', 'Panoramic', 'Impacted third molars bilaterally. #1 and #16 showing horizontal impaction with proximity to inferior alveolar nerve.', '{"annotations": [{"area": "third_molars", "finding": "impacted_teeth", "confidence": 0.93}]}', 'moderate', 'reviewed', 'Oral surgery referral for extraction'),
      (8, 'CBCT scan upper right quadrant', '3', 'CBCT', 'Three-dimensional analysis reveals vertical root fracture on tooth #3. Fracture extends from cervical to apical third.', '{"annotations": [{"area": "root_3", "finding": "vertical_root_fracture", "confidence": 0.91}]}', 'high', 'reviewed', 'Extraction required, discuss implant options'),
      (9, 'Bitewing radiograph bilateral', '2-15', 'Bitewing', 'No caries detected. Excellent bone levels. Existing restorations intact.', '{"annotations": [{"area": "bilateral", "finding": "normal", "confidence": 0.97}]}', 'low', 'completed', 'Excellent oral health maintained'),
      (10, 'Periapical radiograph lower right', '30', 'Periapical', 'Internal resorption detected in tooth #30. Irregular radiolucent area within pulp chamber.', '{"annotations": [{"area": "pulp_30", "finding": "internal_resorption", "confidence": 0.89}]}', 'high', 'pending', 'Urgent root canal or extraction needed'),
      (11, 'Panoramic radiograph', 'Full', 'Panoramic', 'Gingival hyperplasia affecting multiple areas. Calculus deposits visible on mandibular anteriors.', '{"annotations": [{"area": "mandibular_anterior", "finding": "gingival_hyperplasia", "confidence": 0.90}]}', 'moderate', 'reviewed', 'Deep cleaning scheduled, medication review with physician'),
      (12, 'Periapical radiograph lower wisdom teeth', '17,32', 'Periapical', 'Partially erupted #17 and #32 with follicular space within normal limits. No pathology.', '{"annotations": [{"area": "wisdom_lower", "finding": "partial_eruption", "confidence": 0.86}]}', 'low', 'reviewed', 'Monitor eruption pattern'),
      (13, 'Panoramic radiograph', 'Full', 'Panoramic', 'Generalized severe bone loss. Multiple teeth with poor prognosis. Tooth #8 shows external resorption.', '{"annotations": [{"area": "full_mouth", "finding": "severe_bone_loss", "confidence": 0.94}]}', 'high', 'reviewed', 'Comprehensive treatment plan needed - prosthetic evaluation'),
      (14, 'Bitewing radiograph left', '12-13', 'Bitewing', 'Small occlusal caries on tooth #13. No interproximal caries detected.', '{"annotations": [{"area": "occlusal_13", "finding": "small_caries", "confidence": 0.85}]}', 'low', 'completed', 'Preventive resin restoration placed'),
      (15, 'Periapical radiograph upper left', '10', 'Periapical', 'Post-traumatic changes noted. Obliteration of pulp canal space in tooth #10. No periapical pathology.', '{"annotations": [{"area": "canal_10", "finding": "pulp_obliteration", "confidence": 0.88}]}', 'moderate', 'reviewed', 'Monitor vitality, no treatment needed currently'),
      (16, 'Bitewing radiograph bilateral', '4-5,12-13', 'Bitewing', 'Cervical burnout artifact on teeth #4 and #12. No true caries detected.', '{"annotations": [{"area": "cervical", "finding": "artifact_no_caries", "confidence": 0.92}]}', 'low', 'completed', 'Artifact confirmed, no treatment needed'),
      (17, 'Panoramic radiograph', 'Full', 'Panoramic', 'Moderate bone loss in posterior regions. Calculus visible. Periapical radiolucency on tooth #19.', '{"annotations": [{"area": "tooth_19", "finding": "periapical_pathology", "confidence": 0.90}]}', 'moderate', 'pending', 'Periodontal and endodontic evaluation needed'),
      (18, 'Bitewing radiograph right', '3-5', 'Bitewing', 'Multiple interproximal caries: distal #3, mesial #4, distal #5. Consistent with high caries risk.', '{"annotations": [{"area": "right_posterior", "finding": "multiple_caries", "confidence": 0.93}]}', 'high', 'reviewed', 'Multiple restorations needed, increase fluoride protocol')
    `);

    // Seed 18 treatment plans
    await client.query(`
      INSERT INTO treatment_plans (patient_id, diagnosis, treatment_description, ai_recommendation, procedures, estimated_cost, priority, status, start_date, end_date, notes) VALUES
      (1, 'Periapical abscess tooth #14', 'Root canal therapy followed by ceramic crown', 'Based on radiographic findings and symptom profile, RCT is the preferred treatment over extraction. Success rate: 92%. Crown recommended post-RCT for structural integrity.', 'D3330 - Root Canal Molar, D2740 - Crown Porcelain/Ceramic', 2850.00, 'high', 'approved', '2026-03-25', '2026-04-15', 'Patient prefers to save tooth'),
      (2, 'Early interproximal caries #18-19', 'Monitoring with fluoride treatment', 'AI analysis indicates early enamel demineralization only. Recommend conservative approach: fluoride varnish application and 6-month monitoring. Intervention if progression noted.', 'D1206 - Fluoride Varnish, D0272 - Bitewings', 185.00, 'low', 'active', '2026-03-20', '2026-09-20', 'Conservative approach agreed upon'),
      (3, 'Chronic periodontitis with diabetes', 'Comprehensive periodontal therapy', 'Patient diabetic status increases periodontal disease risk. Recommend SRP all quadrants with 3-month maintenance. Coordinate with endocrinologist for HbA1c optimization.', 'D4341 - SRP 4+ teeth per quadrant x4, D4910 - Periodontal Maintenance', 3200.00, 'high', 'active', '2026-03-22', '2026-12-22', 'Coordinating with patient physician'),
      (4, 'Deep caries tooth #20 with pulpal involvement', 'Root canal therapy or extraction with implant', 'Deep caries approaching pulp. Two options presented: 1) RCT + Crown ($2,600) with 85% success rate given extent. 2) Extraction + Implant ($4,200) with 95% long-term success.', 'D3320 - RCT Premolar, D2750 - Crown OR D7210 - Extraction, D6010 - Implant', 2600.00, 'high', 'proposed', '2026-04-01', '2026-06-01', 'Patient deciding between options'),
      (5, 'Recurrent caries under amalgam restoration #3', 'Remove failed restoration, ceramic crown', 'Existing amalgam showing marginal breakdown with recurrent decay. Full coverage ceramic crown recommended. AI assessment: remaining tooth structure adequate for crown.', 'D2740 - Crown Porcelain/Ceramic', 1350.00, 'moderate', 'approved', '2026-03-28', '2026-04-10', 'Patient on anticoagulants - coordinate INR'),
      (6, 'Routine preventive care - pregnant patient', 'Prophylaxis with pregnancy-safe protocols', 'Second trimester is optimal window for dental treatment. Recommend thorough prophylaxis and any urgent restorative work. Defer elective procedures until postpartum.', 'D1110 - Prophylaxis Adult, D0120 - Periodic Exam', 225.00, 'moderate', 'active', '2026-03-20', '2026-03-20', 'No x-rays, no nitrous, positioned comfortably'),
      (7, 'Bilateral impacted third molars', 'Surgical extraction of impacted wisdom teeth', 'Horizontal impaction pattern with nerve proximity suggests referral to oral surgeon. Recommend CBCT for surgical planning. IV sedation recommended given complexity.', 'D7240 - Surgical Extraction Impacted x4, D9223 - IV Sedation', 4800.00, 'moderate', 'proposed', '2026-04-15', '2026-04-15', 'Oral surgery referral submitted'),
      (8, 'Vertical root fracture tooth #3', 'Extraction and implant placement', 'Vertical root fracture confirmed on CBCT. Tooth is non-restorable. Recommend extraction with socket preservation followed by implant at 3 months. Consider immediate implant if conditions allow.', 'D7210 - Extraction, D7953 - Socket Preservation, D6010 - Implant, D6058 - Abutment, D6065 - Implant Crown', 5500.00, 'high', 'approved', '2026-03-30', '2026-09-30', 'Discussed immediate vs delayed implant'),
      (9, 'Routine maintenance - excellent oral health', 'Prophylaxis and exam', 'Patient demonstrates exemplary oral hygiene. No intervention needed. Continue 6-month preventive schedule. AI risk assessment: Low caries risk, low periodontal risk.', 'D1110 - Prophylaxis, D0120 - Periodic Exam, D0274 - Bitewings', 280.00, 'low', 'completed', '2026-03-15', '2026-03-15', 'Congratulated patient on excellent care'),
      (10, 'Internal resorption tooth #30', 'Emergency root canal or extraction', 'Internal resorption detected early. If resorption has not perforated, RCT with MTA repair has 78% success rate. If perforated, extraction recommended. Urgent treatment needed.', 'D3330 - RCT Molar, D9110 - Emergency Visit', 2100.00, 'high', 'proposed', '2026-03-24', '2026-04-07', 'Urgent - schedule ASAP'),
      (11, 'Phenytoin-induced gingival hyperplasia', 'Gingivectomy and enhanced hygiene protocol', 'Drug-induced gingival overgrowth requires surgical recontouring. Coordinate with neurologist regarding medication alternatives. Enhanced oral hygiene protocol essential.', 'D4210 - Gingivectomy per quadrant x4, D4341 - SRP', 3600.00, 'moderate', 'approved', '2026-04-05', '2026-05-05', 'Physician contacted re: medication change'),
      (12, 'Partially erupted wisdom teeth monitoring', 'Clinical and radiographic monitoring', 'Wisdom teeth partially erupted but no pathology. Current recommendation is monitoring. Extraction indicated if: pericoronitis develops, caries detected, or adverse eruption pattern.', 'D0220 - Periapical X-ray, D0120 - Periodic Exam', 120.00, 'low', 'active', '2026-03-20', '2026-09-20', 'Asymptomatic, continue monitoring'),
      (13, 'Severe periodontitis with multiple hopeless teeth', 'Full mouth rehabilitation with prosthetics', 'Severe bone loss affecting multiple teeth. Recommend strategic extractions of hopeless teeth, immediate denture placement, with future implant-supported prosthesis when healing complete.', 'D7210 - Extractions x6, D5110 - Complete Upper Denture, D5214 - Partial Lower, D6010 - Implants x4', 18500.00, 'high', 'proposed', '2026-04-01', '2027-04-01', 'Complex case - phased treatment plan'),
      (14, 'Small occlusal caries tooth #13', 'Preventive resin restoration', 'Minimal occlusal caries confined to enamel. Preventive resin restoration (sealant-restoration hybrid) is most conservative approach. No anesthesia needed.', 'D1352 - Preventive Resin Restoration', 175.00, 'low', 'completed', '2026-03-18', '2026-03-18', 'Completed in single visit, no anesthesia'),
      (15, 'Post-traumatic pulp obliteration tooth #10', 'Monitoring with vitality testing', 'Pulp canal obliteration is healing response to trauma. Tooth vital on testing. No treatment needed now. Monitor annually with periapical radiograph and vitality testing.', 'D0220 - Periapical X-ray, D0460 - Pulp Vitality Test', 95.00, 'low', 'active', '2026-03-20', '2027-03-20', 'Annual monitoring protocol established'),
      (16, 'No pathology - artifact on radiograph', 'No treatment needed', 'Cervical burnout is common radiographic artifact mimicking cervical caries. Clinical examination confirms no caries. No treatment indicated.', 'D0120 - Periodic Exam', 75.00, 'low', 'completed', '2026-03-15', '2026-03-15', 'Patient reassured about findings'),
      (17, 'Periapical pathology #19 with periodontal disease', 'Combined endo-perio treatment', 'Tooth #19 shows combined endodontic-periodontic lesion. Recommend RCT first, then reassess periodontal status at 3 months. Prognosis guarded due to HIV status - ensure viral load controlled.', 'D3330 - RCT Molar, D4341 - SRP, D2750 - Crown', 3400.00, 'high', 'approved', '2026-03-26', '2026-07-26', 'Confirm viral load status before surgery'),
      (18, 'Multiple interproximal caries high risk', 'Multiple restorations with caries management', 'High caries risk patient (dry mouth from hypothyroid meds). Treat existing lesions and implement aggressive prevention: prescription fluoride toothpaste, MI Paste, 3-month recalls.', 'D2391 - Composite 1 surface x3, D1206 - Fluoride Varnish, D5410 - Prescription Fluoride', 1250.00, 'moderate', 'approved', '2026-03-27', '2026-04-10', 'Caries management protocol initiated')
    `);

    // Seed 18 insurance claims
    await client.query(`
      INSERT INTO insurance_claims (patient_id, treatment_plan_id, insurance_provider, policy_number, claim_amount, approved_amount, procedure_codes, ai_pre_auth_notes, status, submission_date, response_date, denial_reason) VALUES
      (1, 1, 'Delta Dental', 'DD-78901', 2850.00, 2280.00, 'D3330, D2740', 'Pre-authorization recommended: Periapical radiograph confirms apical pathology on #14. Clinical symptoms include spontaneous pain and sensitivity to heat. Root canal therapy is medically necessary to preserve the tooth and prevent spread of infection.', 'approved', '2026-03-20', '2026-03-23', NULL),
      (2, 2, 'MetLife Dental', 'ML-34567', 185.00, 185.00, 'D1206, D0272', 'Preventive services within plan coverage. No pre-authorization needed for diagnostic and preventive codes.', 'approved', '2026-03-20', '2026-03-21', NULL),
      (3, 3, 'Cigna Dental', 'CG-45678', 3200.00, 2560.00, 'D4341x4, D4910', 'Pre-authorization for periodontal treatment: Patient presents with clinical attachment loss >5mm in multiple sites, BOP 60%, and radiographic bone loss. Diabetes is complicating factor. Scaling and root planing all quadrants medically necessary.', 'approved', '2026-03-18', '2026-03-22', NULL),
      (4, 4, 'Aetna Dental', 'AE-56789', 2600.00, NULL, 'D3320, D2750', 'Pre-authorization submitted: Deep caries on tooth #20 with confirmed pulpal involvement. Root canal therapy and crown are medically necessary to restore function and prevent extraction.', 'pending', '2026-03-22', NULL, NULL),
      (5, 5, 'Delta Dental', 'DD-67890', 1350.00, 1080.00, 'D2740', 'Pre-authorization for crown: Existing amalgam on tooth #3 shows marginal breakdown with recurrent decay. Remaining tooth structure requires full coverage restoration for protection against fracture.', 'approved', '2026-03-19', '2026-03-22', NULL),
      (6, 6, 'Guardian Dental', 'GD-78901', 225.00, 225.00, 'D1110, D0120', 'Routine preventive services - covered under plan benefits. No pre-authorization required.', 'approved', '2026-03-20', '2026-03-20', NULL),
      (7, 7, 'United Concordia', 'UC-89012', 4800.00, NULL, 'D7240x4, D9223', 'Pre-authorization for surgical extractions: Panoramic radiograph shows bilaterally impacted third molars with horizontal angulation. CBCT confirms proximity to inferior alveolar nerve requiring surgical approach under IV sedation.', 'pending', '2026-03-21', NULL, NULL),
      (8, 8, 'MetLife Dental', 'ML-90123', 5500.00, 3850.00, 'D7210, D7953, D6010, D6058, D6065', 'Pre-authorization for extraction and implant: CBCT confirms non-restorable vertical root fracture on #3. Extraction with socket preservation and delayed implant placement is standard of care for optimal long-term outcome.', 'partial', '2026-03-17', '2026-03-22', 'Socket preservation (D7953) not covered under current plan'),
      (9, 9, 'Cigna Dental', 'CG-01234', 280.00, 280.00, 'D1110, D0120, D0274', 'Routine preventive services - covered under plan benefits.', 'approved', '2026-03-15', '2026-03-15', NULL),
      (10, 10, 'Aetna Dental', 'AE-12345', 2100.00, NULL, 'D3330, D9110', 'URGENT pre-authorization: Internal resorption detected on tooth #30. Immediate root canal therapy needed to prevent perforation and tooth loss. Delay may result in need for extraction and more costly implant.', 'pending', '2026-03-23', NULL, NULL),
      (11, 11, 'Delta Dental', 'DD-23456', 3600.00, 2160.00, 'D4210x4, D4341', 'Pre-authorization for gingivectomy: Drug-induced (phenytoin) gingival hyperplasia requiring surgical recontouring for hygiene access and function. Medical necessity documented.', 'partial', '2026-03-16', '2026-03-20', 'Only 2 quadrants approved per benefit period. Remaining 2 quadrants eligible next benefit year.'),
      (12, 12, 'Guardian Dental', 'GD-34567', 120.00, 120.00, 'D0220, D0120', 'Diagnostic services for monitoring partially erupted wisdom teeth. Covered under plan.', 'approved', '2026-03-20', '2026-03-20', NULL),
      (13, 13, 'Medicare Dental', 'MC-45678', 18500.00, 5200.00, 'D7210x6, D5110, D5214, D6010x4', 'Complex rehabilitation case: Multiple extractions needed due to severe periodontal disease with hopeless prognosis. Immediate denture for function and aesthetics. Future implant-supported prosthesis planned.', 'partial', '2026-03-15', '2026-03-21', 'Implants not covered. Only extractions and dentures approved. Patient responsible for implant costs.'),
      (14, 14, 'United Concordia', 'UC-56789', 175.00, 175.00, 'D1352', 'Preventive resin restoration covered under preventive benefits for patients under 21.', 'approved', '2026-03-18', '2026-03-18', NULL),
      (15, 15, 'MetLife Dental', 'ML-67890', 95.00, 95.00, 'D0220, D0460', 'Diagnostic services for monitoring post-traumatic tooth. Covered under diagnostic benefits.', 'approved', '2026-03-20', '2026-03-20', NULL),
      (16, 16, 'Cigna Dental', 'CG-78901', 75.00, 75.00, 'D0120', 'Periodic examination covered under preventive benefits.', 'approved', '2026-03-15', '2026-03-15', NULL),
      (17, 17, 'Aetna Dental', 'AE-89012', 3400.00, 2720.00, 'D3330, D4341, D2750', 'Pre-authorization for combined endo-perio treatment: Tooth #19 presents with combined endodontic-periodontic lesion. Sequential treatment approach: RCT first, then periodontal therapy, then crown. All procedures medically necessary.', 'approved', '2026-03-19', '2026-03-23', NULL),
      (18, 18, 'Delta Dental', 'DD-90123', 1250.00, NULL, 'D2391x3, D1206, D5410', 'Pre-authorization for multiple restorations: Three interproximal carious lesions confirmed radiographically. High caries risk patient due to medication-induced xerostomia. Caries management program recommended.', 'denied', '2026-03-20', '2026-03-24', 'Prescription fluoride (D5410) not a covered benefit. Resubmit for restorations and fluoride varnish only.')
    `);

    // Seed 18 appointments
    await client.query(`
      INSERT INTO appointments (patient_id, appointment_date, duration_minutes, appointment_type, provider, operatory, status, notes) VALUES
      (1, '2026-03-25 09:00:00', 90, 'Root Canal Therapy', 'Dr. Sarah Smith', 'Op 1', 'scheduled', 'RCT tooth #14 - have endo kit ready'),
      (2, '2026-03-26 10:00:00', 30, 'Periodic Exam & Prophylaxis', 'Lisa Chen', 'Op 3', 'scheduled', 'Fluoride varnish application'),
      (3, '2026-03-22 08:00:00', 60, 'SRP - Upper Right Quadrant', 'Dr. Sarah Smith', 'Op 1', 'confirmed', 'First of 4 SRP appointments'),
      (4, '2026-04-01 14:00:00', 45, 'Consultation', 'Dr. Michael Jones', 'Op 2', 'scheduled', 'Treatment options discussion - RCT vs extraction #20'),
      (5, '2026-03-28 11:00:00', 60, 'Crown Preparation', 'Dr. Michael Jones', 'Op 2', 'confirmed', 'Check INR before procedure - must be <3.0'),
      (6, '2026-03-20 09:30:00', 45, 'Prophylaxis - Prenatal', 'Lisa Chen', 'Op 3', 'completed', 'Pregnancy-safe protocols followed'),
      (7, '2026-04-15 08:00:00', 120, 'Surgical Extractions', 'Oral Surgery Referral', 'Ext', 'scheduled', 'IV sedation - NPO after midnight'),
      (8, '2026-03-30 10:00:00', 60, 'Extraction & Socket Preservation', 'Dr. Sarah Smith', 'Op 1', 'confirmed', 'Extraction #3, bone graft ready'),
      (9, '2026-09-15 14:00:00', 30, 'Periodic Exam & Prophylaxis', 'Lisa Chen', 'Op 3', 'scheduled', '6-month recall'),
      (10, '2026-03-24 08:00:00', 90, 'Emergency Root Canal', 'Dr. Sarah Smith', 'Op 1', 'confirmed', 'URGENT - internal resorption #30'),
      (11, '2026-04-05 09:00:00', 90, 'Gingivectomy - Right Side', 'Dr. Michael Jones', 'Op 2', 'scheduled', 'Quadrants 1 and 4 first'),
      (12, '2026-09-20 15:00:00', 20, 'Wisdom Teeth Check', 'Dr. Sarah Smith', 'Op 1', 'scheduled', 'Monitoring appointment'),
      (13, '2026-04-01 08:00:00', 120, 'Multiple Extractions', 'Dr. Sarah Smith', 'Op 1', 'scheduled', 'Phase 1: Extract hopeless teeth, immediate upper denture'),
      (14, '2026-06-18 14:30:00', 30, 'Periodic Exam & Prophylaxis', 'Lisa Chen', 'Op 3', 'scheduled', '6-month recall'),
      (15, '2027-03-20 10:00:00', 20, 'Annual Monitoring', 'Dr. Michael Jones', 'Op 2', 'scheduled', 'Vitality test and PA radiograph tooth #10'),
      (16, '2026-09-15 11:00:00', 30, 'Periodic Exam', 'Lisa Chen', 'Op 3', 'scheduled', '6-month recall'),
      (17, '2026-03-26 08:00:00', 90, 'Root Canal Therapy', 'Dr. Michael Jones', 'Op 2', 'confirmed', 'RCT tooth #19 - confirm viral load results'),
      (18, '2026-03-27 13:00:00', 60, 'Multiple Restorations', 'Dr. Sarah Smith', 'Op 1', 'confirmed', 'Composites #3D, #4M, #5D - use fluoride releasing material')
    `);

    // Seed 18 recall campaigns
    await client.query(`
      INSERT INTO recall_campaigns (patient_id, campaign_type, recall_reason, due_date, contact_method, message_template, ai_personalized_message, status, sent_date, response_received) VALUES
      (1, '6-Month Recall', 'Regular preventive checkup', '2026-09-25', 'email', 'standard_recall', 'Dear John, it has been 6 months since your root canal treatment. Your follow-up exam is important to ensure complete healing and check the success of your treatment. We look forward to seeing you!', 'sent', '2026-03-20 10:00:00', false),
      (2, 'Follow-up', 'Caries monitoring check', '2026-09-26', 'sms', 'followup_care', 'Hi Emily! Time for your follow-up to check on those areas we are monitoring. Early detection means simpler treatment. Book your visit today!', 'pending', NULL, false),
      (3, '3-Month Perio Maintenance', 'Periodontal maintenance required', '2026-06-22', 'email', 'perio_maintenance', 'Dear Robert, as part of your periodontal treatment plan, your 3-month maintenance cleaning is coming due. Regular maintenance is especially important with your health history. Please schedule at your earliest convenience.', 'sent', '2026-03-19 09:00:00', true),
      (4, 'Treatment Pending', 'Decision needed on treatment plan', '2026-04-01', 'phone', 'treatment_decision', 'Dear Maria, we wanted to follow up on the treatment options we discussed for tooth #20. If you have any questions about the root canal or extraction options, please do not hesitate to call us. We are here to help you make the best decision.', 'sent', '2026-03-21 14:00:00', false),
      (5, '6-Month Recall', 'Post-crown follow-up', '2026-09-28', 'email', 'standard_recall', 'Dear James, it is time for your regular checkup! We will also want to evaluate how your new crown is performing. Remember, your anticoagulant therapy means we need to coordinate your INR check before your visit.', 'pending', NULL, false),
      (6, 'Postpartum Follow-up', 'Post-pregnancy dental assessment', '2026-08-20', 'email', 'special_care', 'Dear Sarah, congratulations on your new arrival! Now that you have delivered, we would love to schedule a comprehensive dental checkup. Pregnancy can affect oral health, so a thorough evaluation is recommended. Call us when you are ready!', 'pending', NULL, false),
      (7, 'Post-Surgery Follow-up', 'Wisdom teeth surgery recovery', '2026-04-22', 'sms', 'post_surgical', 'Hi David! One week post-surgery check. How are you healing? Please come in so Dr. Smith can evaluate your recovery and remove sutures if needed.', 'pending', NULL, false),
      (8, 'Implant Follow-up', 'Implant placement scheduling', '2026-06-30', 'email', 'implant_followup', 'Dear Jennifer, it has been 3 months since your extraction and socket preservation. Your healing should be progressing well. It is time to schedule your implant placement appointment. Contact us to move forward with your treatment.', 'pending', NULL, false),
      (9, '6-Month Recall', 'Regular preventive checkup', '2026-09-15', 'email', 'standard_recall', 'Dear Michael, your excellent oral health is a testament to your great home care! It is time for your 6-month checkup. Keep up the amazing work and we will see you soon!', 'sent', '2026-03-15 10:00:00', true),
      (10, 'Urgent Follow-up', 'Internal resorption monitoring', '2026-04-07', 'phone', 'urgent_care', 'Dear Amanda, this is an important reminder about your follow-up for tooth #30. Timely treatment is crucial to save your tooth. Please call us immediately to confirm your appointment.', 'sent', '2026-03-22 08:00:00', true),
      (11, '3-Month Follow-up', 'Post-gingivectomy healing', '2026-07-05', 'email', 'post_surgical', 'Dear Christopher, it is time to check your healing progress after the gingivectomy. We also want to assess how the medication adjustment is affecting your gum tissue. See you soon!', 'pending', NULL, false),
      (12, '6-Month Recall', 'Wisdom teeth monitoring', '2026-09-20', 'sms', 'standard_recall', 'Hi Jessica! Time for your 6-month check. We will be monitoring your wisdom teeth development. Quick and easy visit!', 'pending', NULL, false),
      (13, 'Treatment Phase Follow-up', 'Next phase of rehabilitation', '2026-05-01', 'phone', 'complex_treatment', 'Dear William, we hope you are adjusting well to your new denture. It is time to schedule your follow-up to check fit and comfort, and discuss the next phase of your implant treatment plan.', 'pending', NULL, false),
      (14, '6-Month Recall', 'Regular preventive checkup', '2026-06-18', 'email', 'standard_recall', 'Hi Ashley! Your next cleaning is coming up. Regular visits help us keep your smile healthy and catch any concerns early. See you at your appointment!', 'sent', '2026-03-18 10:00:00', true),
      (15, 'Annual Monitoring', 'Post-trauma tooth monitoring', '2027-03-20', 'email', 'monitoring', 'Dear Daniel, your annual check on tooth #10 is approaching. This monitoring visit helps us ensure the tooth remains healthy after your previous trauma. Please schedule your appointment.', 'pending', NULL, false),
      (16, '6-Month Recall', 'Regular preventive checkup', '2026-09-15', 'email', 'standard_recall', 'Dear Nicole, it is time for your regular dental checkup! We have noted your preference for gluten-free dental products and will have everything prepared for your comfort.', 'pending', NULL, false),
      (17, '3-Month Perio Check', 'Periodontal reassessment', '2026-06-26', 'email', 'perio_maintenance', 'Dear Matthew, your 3-month periodontal check is due. This is an important part of maintaining your oral health. We coordinate with your healthcare team to ensure the best care.', 'pending', NULL, false),
      (18, '3-Month High Risk Recall', 'High caries risk management', '2026-06-27', 'sms', 'high_risk', 'Hi Lauren! As part of your caries prevention program, your 3-month check is coming up. We will apply fluoride and check how the new protocol is working. Your smile is worth it!', 'pending', NULL, false)
    `);

    // Seed invoices
    await client.query(`
      INSERT INTO invoices (patient_id, items, subtotal, tax_rate, tax_amount, total_amount, paid_amount, status, due_date) VALUES
      (1, '[{"description":"Dental Cleaning","quantity":1,"unit_price":150},{"description":"X-Ray","quantity":2,"unit_price":75}]', 300, 0, 0, 300, 300, 'paid', '2026-02-15'),
      (2, '[{"description":"Root Canal","quantity":1,"unit_price":950},{"description":"Crown","quantity":1,"unit_price":1200}]', 2150, 0, 0, 2150, 1000, 'partial', '2026-03-01'),
      (3, '[{"description":"Dental Cleaning","quantity":1,"unit_price":150},{"description":"Fluoride Treatment","quantity":1,"unit_price":45}]', 195, 0, 0, 195, 195, 'paid', '2026-01-20'),
      (4, '[{"description":"Cavity Filling","quantity":2,"unit_price":200}]', 400, 0, 0, 400, 0, 'unpaid', '2026-04-01'),
      (5, '[{"description":"Wisdom Tooth Extraction","quantity":1,"unit_price":350}]', 350, 0, 0, 350, 350, 'paid', '2026-02-28'),
      (6, '[{"description":"Dental Implant Consultation","quantity":1,"unit_price":200},{"description":"X-Ray","quantity":3,"unit_price":75}]', 425, 0, 0, 425, 0, 'overdue', '2026-01-15'),
      (7, '[{"description":"Teeth Whitening","quantity":1,"unit_price":500}]', 500, 0, 0, 500, 500, 'paid', '2026-03-10'),
      (8, '[{"description":"Dental Cleaning","quantity":1,"unit_price":150}]', 150, 0, 0, 150, 0, 'unpaid', '2026-04-15')
    `);

    // Seed payments
    await client.query(`
      INSERT INTO payments (invoice_id, amount, payment_method, reference_number, payment_date) VALUES
      (1, 300, 'credit_card', 'CC-20260215-001', '2026-02-15 14:30:00'),
      (2, 500, 'insurance', 'INS-20260220-001', '2026-02-20 10:00:00'),
      (2, 500, 'credit_card', 'CC-20260225-002', '2026-02-25 16:00:00'),
      (3, 195, 'cash', NULL, '2026-01-20 11:00:00'),
      (5, 350, 'debit_card', 'DB-20260228-001', '2026-02-28 09:30:00'),
      (7, 500, 'credit_card', 'CC-20260310-001', '2026-03-10 15:00:00')
    `);

    // Seed inventory
    await client.query(`
      INSERT INTO inventory (name, category, sku, quantity, unit, unit_cost, reorder_level, supplier) VALUES
      ('Nitrile Gloves (Medium)', 'PPE', 'PPE-GLV-M', 500, 'pairs', 0.15, 100, 'MedSupply Co'),
      ('Nitrile Gloves (Large)', 'PPE', 'PPE-GLV-L', 300, 'pairs', 0.15, 100, 'MedSupply Co'),
      ('Face Masks', 'PPE', 'PPE-MSK-01', 200, 'units', 0.25, 50, 'MedSupply Co'),
      ('Composite Resin A2', 'Restorative', 'RES-CMP-A2', 25, 'syringes', 45.00, 10, 'DentalDirect'),
      ('Composite Resin A3', 'Restorative', 'RES-CMP-A3', 18, 'syringes', 45.00, 10, 'DentalDirect'),
      ('Dental Cement', 'Restorative', 'RES-CMT-01', 12, 'tubes', 32.00, 5, 'DentalDirect'),
      ('Anesthetic Carpules (Lidocaine)', 'Anesthesia', 'ANE-LID-01', 150, 'carpules', 2.50, 50, 'PharmaDent'),
      ('Anesthetic Carpules (Articaine)', 'Anesthesia', 'ANE-ART-01', 80, 'carpules', 3.00, 30, 'PharmaDent'),
      ('Disposable Needles 27G', 'Anesthesia', 'ANE-NDL-27', 200, 'units', 0.35, 50, 'PharmaDent'),
      ('Prophy Paste', 'Preventive', 'PRV-PPT-01', 8, 'jars', 18.00, 5, 'OralCare Plus'),
      ('Fluoride Varnish', 'Preventive', 'PRV-FLR-01', 45, 'units', 4.50, 20, 'OralCare Plus'),
      ('Impression Material', 'Prosthetics', 'PRS-IMP-01', 6, 'cartridges', 55.00, 3, 'DentalDirect'),
      ('Temporary Crown Material', 'Prosthetics', 'PRS-TMP-01', 4, 'kits', 85.00, 2, 'DentalDirect'),
      ('Endo Files (#15-40)', 'Endodontics', 'END-FIL-01', 30, 'packs', 28.00, 10, 'EndoSupply'),
      ('Suture Kit', 'Surgical', 'SUR-SUT-01', 20, 'kits', 12.00, 10, 'MedSupply Co'),
      ('Sterilization Pouches', 'Sterilization', 'STR-PCH-01', 500, 'units', 0.10, 200, 'MedSupply Co')
    `);

    // Seed clinical notes
    await client.query(`
      INSERT INTO clinical_notes (patient_id, visit_date, note_type, chief_complaint, subjective, objective, assessment, plan, provider, tooth_numbers, procedures_performed) VALUES
      (1, '2026-03-15', 'progress', 'Routine cleaning', 'Patient reports no concerns. Brushing 2x daily, flossing regularly.', 'Mild calculus buildup on lower anteriors. Gingiva healthy, no bleeding on probing. All restorations intact.', 'Good oral hygiene. Minimal calculus. No caries detected.', 'Continue current hygiene routine. Return in 6 months for next cleaning.', 'Dr. Sarah Smith', NULL, 'Prophylaxis, Fluoride treatment'),
      (2, '2026-03-10', 'treatment', 'Tooth pain upper right', 'Patient reports sharp pain on tooth #3 when biting. Pain started 2 weeks ago, getting worse.', 'Tooth #3: large existing MOD amalgam with recurrent decay. Percussion positive. Cold test lingering response >10 seconds. Periapical radiolucency visible on PA.', 'Irreversible pulpitis tooth #3 with periapical pathology.', 'Root canal therapy tooth #3 today. Crown placement in 2 weeks. Prescribed Amoxicillin 500mg TID x7 days, Ibuprofen 600mg TID PRN.', 'Dr. Michael Jones', '#3', 'Root canal therapy, Temporary restoration'),
      (3, '2026-02-20', 'progress', 'Regular checkup', 'No complaints. Patient maintaining good oral hygiene per orthodontist instructions.', 'Orthodontic appliances in good condition. Mild gingivitis around brackets. No decalcification noted.', 'Satisfactory orthodontic progress. Mild gingivitis requiring improved brushing around brackets.', 'Reinforce brushing technique around brackets. Recommend interdental brushes. Next visit in 3 months.', 'Lisa Chen', NULL, 'Prophylaxis around orthodontic appliances'),
      (4, '2026-03-05', 'treatment', 'Broken filling', 'Patient reports piece of filling fell out while eating. No pain currently.', 'Tooth #14: fractured mesial composite. Secondary caries at margin. No sensitivity to percussion or cold.', 'Secondary caries tooth #14 with failed composite restoration.', 'Removed old composite, excavated caries, placed new composite restoration (MOD). Patient tolerated well.', 'Dr. Sarah Smith', '#14', 'Composite restoration MOD'),
      (5, '2026-01-28', 'consultation', 'Wisdom tooth evaluation', 'Patient referred for wisdom tooth evaluation. Intermittent pain lower right.', 'Tooth #32: partially erupted, soft tissue operculum with mild inflammation. Pericoronitis noted. OPG shows mesioangular impaction.', 'Pericoronitis tooth #32 with mesioangular impaction. Recommend extraction.', 'Scheduled surgical extraction of #32. Prescribed Chlorhexidine rinse for pericoronitis. Pre-op instructions given.', 'Dr. Michael Jones', '#32', 'Clinical exam, Radiographic evaluation'),
      (6, '2026-02-14', 'progress', 'Denture adjustment', 'Patient reports soreness under lower denture. Difficulty chewing on left side.', 'Lower denture: pressure point noted on left posterior ridge. Mild tissue irritation. Denture otherwise stable.', 'Pressure sore from lower denture. Adjustment needed.', 'Adjusted lower denture left posterior area. Patient to return in 1 week if discomfort persists. Discuss implant options at next visit.', 'Dr. Sarah Smith', NULL, 'Denture adjustment')
    `);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
