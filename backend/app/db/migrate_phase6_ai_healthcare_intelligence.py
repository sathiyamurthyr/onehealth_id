"""
OH-ID PHASE 6: AI-POWERED HEALTHCARE INTELLIGENCE & AUTONOMOUS OPERATIONS MIGRATION
Sathus Technology Pvt Ltd

Creates:
1. oh_id.ai_providers - Registry of AI providers (Gemini, OpenAI, Claude, Ollama, Offline Mock)
2. oh_id.ai_models - Configured models and cost/token rates
3. oh_id.ai_prompts - Versioned prompt templates
4. oh_id.ai_audit_logs - Immutable log of AI invocations, tokens, latency, cost, and safety flags
5. oh_id.ai_insights - Stored clinical summaries, briefs, lab trends, and operational recommendations
6. oh_id.ai_predictions - Operational forecasts (no-show probability, queue delays, bed occupancy)
7. oh_id.knowledge_documents & oh_id.knowledge_chunks - Enterprise SOPs and clinical guidelines for RAG
8. oh_id.ai_agents & oh_id.ai_agent_tasks - Controlled workflow agents with human-in-the-loop approval
9. Analytical Views:
   - oh_id.vw_ai_governance_telemetry
   - oh_id.vw_ai_operational_predictions
   - oh_id.vw_patient_longitudinal_health_summary
"""

import sys
from pathlib import Path
_root_dir = str(Path(__file__).resolve().parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

import psycopg2
from psycopg2.extras import RealDictCursor
from backend.app.core.config import settings

def run_migration():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("Executing Phase 6 AI Healthcare Intelligence & Autonomous Operations Migration...")

        # 1. AI Providers Registry
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ai_providers (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(100) NOT NULL, -- OFFLINE_MOCK, GEMINI, OPENAI, ANTHROPIC, OLLAMA
                display_name VARCHAR(150) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_default BOOLEAN DEFAULT FALSE,
                api_base_url TEXT,
                config JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. AI Models Registry
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ai_models (
                id VARCHAR(64) PRIMARY KEY,
                provider_id VARCHAR(64) REFERENCES oh_id.ai_providers(id) ON DELETE CASCADE,
                model_name VARCHAR(100) NOT NULL,
                capability VARCHAR(64) NOT NULL, -- CLINICAL_SUMMARIZATION, REASONING, FAST_CHAT, PREDICTION, EMBEDDINGS
                cost_per_1k_input_tokens NUMERIC(10, 6) DEFAULT 0.000000,
                cost_per_1k_output_tokens NUMERIC(10, 6) DEFAULT 0.000000,
                max_context_tokens INT DEFAULT 128000,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_provider_model UNIQUE (provider_id, model_name)
            );
        """)

        # 3. Versioned Prompt Templates
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ai_prompts (
                id VARCHAR(64) PRIMARY KEY,
                prompt_key VARCHAR(100) NOT NULL,
                version INT NOT NULL DEFAULT 1,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                system_prompt TEXT NOT NULL,
                user_prompt_template TEXT NOT NULL,
                temperature NUMERIC(3, 2) DEFAULT 0.20,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_prompt_key_version UNIQUE (prompt_key, version)
            );
            CREATE INDEX IF NOT EXISTS idx_prompts_lookup ON oh_id.ai_prompts(prompt_key, is_active);
        """)

        # 4. Immutable AI Request & Response Audit Log
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ai_audit_logs (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE SET NULL,
                user_id VARCHAR(64) REFERENCES oh_id.users(id) ON DELETE SET NULL,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE SET NULL,
                module VARCHAR(64) NOT NULL, -- CLINICAL_COPILOT, PATIENT_ASSISTANT, OPS_INTELLIGENCE, AGENT, SEARCH, RAG
                model_name VARCHAR(100) NOT NULL,
                prompt_key VARCHAR(100),
                prompt_tokens INT DEFAULT 0,
                completion_tokens INT DEFAULT 0,
                latency_ms INT DEFAULT 0,
                cost_estimated NUMERIC(10, 6) DEFAULT 0.000000,
                safety_flags JSONB DEFAULT '[]'::jsonb,
                is_success BOOLEAN DEFAULT TRUE,
                error_message TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_ai_audit_hosp_mod ON oh_id.ai_audit_logs(hospital_id, module, created_at);
            CREATE INDEX IF NOT EXISTS idx_ai_audit_pat ON oh_id.ai_audit_logs(patient_id, created_at);
        """)

        # 5. Stored AI Insights & Generated Artifacts
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ai_insights (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                patient_id VARCHAR(64) REFERENCES oh_id.patients(id) ON DELETE CASCADE,
                insight_type VARCHAR(64) NOT NULL, -- PATIENT_BRIEF, LAB_TREND, LONGITUDINAL_SUMMARY, OPS_RECOMMENDATION, DISCHARGE_DRAFT
                reference_id VARCHAR(64),
                content_json JSONB NOT NULL,
                grounding_citations JSONB DEFAULT '[]'::jsonb,
                status VARCHAR(32) DEFAULT 'GENERATED', -- GENERATED, ACCEPTED_BY_CLINICIAN, MODIFIED_BY_CLINICIAN, REJECTED
                reviewed_by VARCHAR(64) REFERENCES oh_id.users(id),
                reviewed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_ai_insights_pat ON oh_id.ai_insights(patient_id, insight_type);
            CREATE INDEX IF NOT EXISTS idx_ai_insights_hosp ON oh_id.ai_insights(hospital_id, created_at);
        """)

        # 6. Operational Predictions & Forecasts
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ai_predictions (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                prediction_type VARCHAR(64) NOT NULL, -- NO_SHOW_RISK, QUEUE_WAIT_TIME, BED_OCCUPANCY_FORECAST, ADMISSION_SURGE
                target_entity_id VARCHAR(64),
                predicted_value NUMERIC(10, 2) NOT NULL,
                confidence_score NUMERIC(5, 4) NOT NULL, -- 0.0000 to 1.0000
                features_json JSONB DEFAULT '{}'::jsonb,
                prediction_horizon VARCHAR(32), -- NEXT_1HR, NEXT_24HRS, NEXT_7DAYS
                model_version VARCHAR(50) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_ai_pred_hosp ON oh_id.ai_predictions(hospital_id, prediction_type, created_at);
        """)

        # 7. Enterprise Knowledge Base & RAG Documents
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.knowledge_documents (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(64) NOT NULL, -- SOP, CLINICAL_PROTOCOL, HOSPITAL_POLICY, PATIENT_EDUCATION, DRUG_FORMULARY
                file_type VARCHAR(32) DEFAULT 'MARKDOWN',
                content TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_by VARCHAR(64) REFERENCES oh_id.users(id),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_knowledge_docs_hosp ON oh_id.knowledge_documents(hospital_id, category);

            CREATE TABLE IF NOT EXISTS oh_id.knowledge_chunks (
                id VARCHAR(64) PRIMARY KEY,
                document_id VARCHAR(64) REFERENCES oh_id.knowledge_documents(id) ON DELETE CASCADE,
                chunk_index INT NOT NULL,
                chunk_text TEXT NOT NULL,
                keywords TEXT[],
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON oh_id.knowledge_chunks(document_id);
        """)

        # 8. Autonomous Workflow Agents & Task Queue
        cur.execute("""
            CREATE TABLE IF NOT EXISTS oh_id.ai_agents (
                id VARCHAR(64) PRIMARY KEY,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                agent_type VARCHAR(64) NOT NULL, -- APPOINTMENT_AGENT, FOLLOW_UP_AGENT, OPERATIONS_AGENT, REPORT_AGENT, COMMUNICATION_AGENT
                name VARCHAR(150) NOT NULL,
                schedule_cron VARCHAR(50) DEFAULT '0 */4 * * *',
                is_enabled BOOLEAN DEFAULT TRUE,
                configuration JSONB DEFAULT '{}'::jsonb,
                last_run_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_hosp_agent_type UNIQUE (hospital_id, agent_type)
            );

            CREATE TABLE IF NOT EXISTS oh_id.ai_agent_tasks (
                id VARCHAR(64) PRIMARY KEY,
                agent_id VARCHAR(64) REFERENCES oh_id.ai_agents(id) ON DELETE CASCADE,
                hospital_id VARCHAR(64) REFERENCES oh_id.hospitals(id) ON DELETE CASCADE,
                task_type VARCHAR(64) NOT NULL,
                proposed_action VARCHAR(100) NOT NULL, -- NOTIFY_PATIENT, ESCALATE_QUEUE_ALERT, PROPOSE_APPOINTMENT_RESCHEDULE, DRAFT_DAILY_REPORT
                payload JSONB NOT NULL,
                status VARCHAR(32) DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED, FAILED
                requires_human_approval BOOLEAN DEFAULT TRUE,
                approved_by VARCHAR(64) REFERENCES oh_id.users(id),
                approved_at TIMESTAMPTZ,
                execution_result JSONB,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_agent_tasks_hosp ON oh_id.ai_agent_tasks(hospital_id, status);
        """)

        # 9. Analytical Views
        cur.execute("""
            CREATE OR REPLACE VIEW oh_id.vw_ai_governance_telemetry AS
            SELECT 
                l.hospital_id,
                COALESCE(h.name, 'System-Wide') AS hospital_name,
                l.module,
                l.model_name,
                COUNT(*) AS total_requests,
                SUM(l.prompt_tokens) AS total_prompt_tokens,
                SUM(l.completion_tokens) AS total_completion_tokens,
                ROUND(AVG(l.latency_ms), 2) AS avg_latency_ms,
                ROUND(SUM(l.cost_estimated), 4) AS total_cost_estimated,
                COUNT(*) FILTER (WHERE NOT l.is_success) AS failed_requests,
                COUNT(*) FILTER (WHERE jsonb_array_length(l.safety_flags) > 0) AS flagged_safety_events,
                MAX(l.created_at) AS last_activity_at
            FROM oh_id.ai_audit_logs l
            LEFT JOIN oh_id.hospitals h ON l.hospital_id = h.id
            GROUP BY l.hospital_id, h.name, l.module, l.model_name;

            CREATE OR REPLACE VIEW oh_id.vw_ai_operational_predictions AS
            SELECT 
                p.id,
                p.hospital_id,
                h.name AS hospital_name,
                p.prediction_type,
                p.target_entity_id,
                p.predicted_value,
                p.confidence_score,
                p.features_json,
                p.prediction_horizon,
                p.model_version,
                p.created_at
            FROM oh_id.ai_predictions p
            JOIN oh_id.hospitals h ON p.hospital_id = h.id;

            CREATE OR REPLACE VIEW oh_id.vw_patient_longitudinal_health_summary AS
            SELECT 
                p.id AS patient_id,
                p.onehealth_id,
                p.name AS patient_name,
                p.gender,
                p.age,
                p.blood_group,
                COUNT(DISTINCT c.id) AS total_consultations,
                COUNT(DISTINCT pr.id) AS total_prescriptions,
                MAX(c.created_at) AS last_consultation_date,
                MAX(pr.created_at) AS last_prescription_date
            FROM oh_id.patients p
            LEFT JOIN oh_id.opd_consultations c ON p.id = c.patient_id
            LEFT JOIN oh_id.prescriptions pr ON p.id = pr.patient_id
            GROUP BY p.id, p.onehealth_id, p.name, p.gender, p.age, p.blood_group;
        """)

        # 10. Seed Initial AI Providers & Models
        cur.execute("""
            INSERT INTO oh_id.ai_providers (id, name, display_name, is_active, is_default, config)
            VALUES 
                ('prov-mock', 'OFFLINE_MOCK', 'OH-ID Deterministic Clinical & Operations Mock Provider', TRUE, TRUE, '{"mode": "deterministic_offline"}'::jsonb),
                ('prov-gemini', 'GEMINI', 'Google Gemini 1.5 Pro / Flash (Vertex AI / Google AI Studio)', TRUE, FALSE, '{"temperature": 0.2, "top_p": 0.95}'::jsonb),
                ('prov-openai', 'OPENAI', 'OpenAI GPT-4o / GPT-4o-mini', TRUE, FALSE, '{"temperature": 0.2}'::jsonb),
                ('prov-claude', 'ANTHROPIC', 'Anthropic Claude 3.5 Sonnet', TRUE, FALSE, '{"temperature": 0.2}'::jsonb),
                ('prov-ollama', 'OLLAMA', 'Local Private Ollama Deployment (Llama 3.1 / MedLlama)', TRUE, FALSE, '{"base_url": "http://localhost:11434"}'::jsonb)
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO oh_id.ai_models (id, provider_id, model_name, capability, cost_per_1k_input_tokens, cost_per_1k_output_tokens, max_context_tokens, is_active)
            VALUES
                ('mod-mock-clinical', 'prov-mock', 'ohid-deterministic-clinical-v1', 'CLINICAL_SUMMARIZATION', 0.00, 0.00, 128000, TRUE),
                ('mod-mock-ops', 'prov-mock', 'ohid-deterministic-ops-v1', 'PREDICTION', 0.00, 0.00, 64000, TRUE),
                ('mod-gemini-pro', 'prov-gemini', 'gemini-1.5-pro-latest', 'REASONING', 0.001250, 0.005000, 1000000, TRUE),
                ('mod-gemini-flash', 'prov-gemini', 'gemini-1.5-flash-latest', 'FAST_CHAT', 0.000075, 0.000300, 1000000, TRUE),
                ('mod-gpt4o', 'prov-openai', 'gpt-4o', 'REASONING', 0.002500, 0.010000, 128000, TRUE),
                ('mod-claude35', 'prov-claude', 'claude-3-5-sonnet-20241022', 'CLINICAL_SUMMARIZATION', 0.003000, 0.015000, 200000, TRUE),
                ('mod-ollama-llama', 'prov-ollama', 'llama3.1:8b', 'FAST_CHAT', 0.00, 0.00, 32000, TRUE)
            ON CONFLICT (id) DO NOTHING;
        """)

        # 11. Seed Default Prompt Templates
        cur.execute("""
            INSERT INTO oh_id.ai_prompts (id, prompt_key, version, title, description, system_prompt, user_prompt_template, temperature)
            VALUES
                (
                    'prompt-pat-brief-v1',
                    'DOCTOR_PATIENT_BRIEF',
                    1,
                    'Doctor 30-Second Pre-Consultation Patient Brief',
                    'Summarizes active health condition, chief complaints, current medications, allergies, and recent abnormal labs before doctor consultation.',
                    'You are the OH-ID Principal Clinical Intelligence Assistant. You summarize patient history accurately and strictly based on provided medical records. Cite the visit date and record ID for every clinical fact. NEVER invent diagnoses or medications.',
                    'Patient Name: {{patient_name}}\nAge/Gender: {{age_gender}}\nAllergies: {{allergies}}\nCurrent Medications: {{current_meds}}\nRecent Consultations: {{recent_consultations}}\nRecent Lab Results: {{recent_labs}}\nChief Complaint Today: {{chief_complaint}}\n\nGenerate a structured clinical brief:',
                    0.20
                ),
                (
                    'prompt-note-draft-v1',
                    'CONSULTATION_NOTE_DRAFT',
                    1,
                    'Ambient Consultation Note Drafter',
                    'Drafts structured SOAP notes (HPI, Physical Exam, Assessment, Patient Instructions) from doctor intake notes. Note is strictly draft-only and requires explicit doctor review.',
                    'You are the OH-ID Clinical Note Drafter. Convert clinician input into standard SOAP format with clear headings. DO NOT add medications or diagnoses not mentioned by the clinician. Add mandatory disclaimer: "DRAFT ONLY - REQUIRES CLINICIAN SIGN-OFF".',
                    'Clinician Raw Input: {{raw_input}}\nPatient Context: {{patient_context}}\n\nDraft structured clinical note:',
                    0.20
                ),
                (
                    'prompt-lab-trend-v1',
                    'LAB_TREND_ANALYSIS',
                    1,
                    'Longitudinal Analyte Trend Analyzer',
                    'Analyzes numerical lab values over time (Hb, Creatinine, HbA1c, etc.) and highlights trends, reference range shifts, and flags critical results.',
                    'You are the OH-ID Laboratory Intelligence Analyzer. Identify trajectory (Improving, Deteriorating, Stable), compare against physiological reference ranges, and provide both a doctor-facing technical summary and patient-friendly explanation.',
                    'Analyte: {{analyte_name}}\nHistorical Readings (Date, Value, Unit, Ref Range): {{history}}\n\nProvide trend analysis:',
                    0.20
                ),
                (
                    'prompt-patient-journey-v1',
                    'PATIENT_JOURNEY_EXPLAIN',
                    1,
                    'Patient Health Journey Explainer',
                    'Explains doctor consultations, prescriptions, lab results, and follow-up guidance in empathetic, plain language with direct hospital visit citations.',
                    'You are the OH-ID Patient Care Assistant. Explain the medical timeline in clear, reassuring, plain English/regional language. Explicitly cite the Hospital, Doctor, and Date for every statement. Never make autonomous medical promises.',
                    'Patient Query: {{query}}\nAuthoritative Records: {{records}}\n\nExplain patient journey clearly:',
                    0.30
                ),
                (
                    'prompt-ops-root-cause-v1',
                    'OPS_ROOT_CAUSE',
                    1,
                    'Hospital Operations Root-Cause Analyzer',
                    'Diagnoses OPD queue delays, registration bottlenecks, doctor lateness, and counter workload imbalances.',
                    'You are the OH-ID Hospital Operations Intelligence Architect. Analyze operational metrics and identify primary bottlenecks, delay contributors, and actionable operational recommendations.',
                    'Hospital Metrics for Date {{date}}:\nOPD Volume: {{opd_volume}}\nAvg Wait Time: {{avg_wait_time}}\nQueue Delays: {{queue_delays}}\nDoctor Availability: {{doctor_availability}}\n\nGenerate Root-Cause Analysis:',
                    0.20
                )
            ON CONFLICT (id) DO NOTHING;
        """)

        # 12. Seed Default Knowledge Base Document for Hospital SOPs
        cur.execute("""
            INSERT INTO oh_id.knowledge_documents (id, hospital_id, title, category, file_type, content, is_active)
            SELECT
                'kdoc-' || h.id || '-opd-sop',
                h.id,
                'Standard Operating Procedure: OPD Triage & Emergency Escalation Protocol',
                'SOP',
                'MARKDOWN',
                '# Standard Operating Procedure: OPD Triage & Escalation Protocol\n\n## 1. Patient Reception & Token Generation\nAll patients arriving at the OPD registration counters must be issued an electronic OH-ID token within 3 minutes of check-in.\n\n## 2. Fast-Track Priority Triage\nPatients presenting with chest pain, severe dyspnea, acute trauma, or high fever (>103°F) must be immediately transferred to the Emergency Intake Bay.\n\n## 3. Queue Management & SLA\nTarget consultation wait time from token generation to doctor consultation is < 20 minutes. If queue length exceeds 15 patients per clinician, the Duty Operations Manager must be notified automatically to open auxiliary consultation chambers.',
                TRUE
            FROM oh_id.hospitals h
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO oh_id.knowledge_chunks (id, document_id, chunk_index, chunk_text, keywords)
            SELECT
                'kchunk-' || h.id || '-opd-1',
                'kdoc-' || h.id || '-opd-sop',
                1,
                'All patients arriving at the OPD registration counters must be issued an electronic OH-ID token within 3 minutes of check-in. Patients presenting with acute symptoms must be routed to Emergency immediately.',
                ARRAY['OPD', 'Token', 'Triage', 'Emergency', 'SOP']
            FROM oh_id.hospitals h
            ON CONFLICT (id) DO NOTHING;
        """)

        # 13. Seed Default AI Agents per Hospital
        cur.execute("""
            INSERT INTO oh_id.ai_agents (id, hospital_id, agent_type, name, schedule_cron, is_enabled, configuration)
            SELECT
                'agent-' || h.id || '-appt',
                h.id,
                'APPOINTMENT_AGENT',
                'Smart Appointment Scheduling & Conflict Agent',
                '0 */2 * * *',
                TRUE,
                '{"auto_reschedule_proposals": true, "max_conflict_lookahead_days": 7}'::jsonb
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, agent_type) DO NOTHING;

            INSERT INTO oh_id.ai_agents (id, hospital_id, agent_type, name, schedule_cron, is_enabled, configuration)
            SELECT
                'agent-' || h.id || '-followup',
                h.id,
                'FOLLOW_UP_AGENT',
                'Chronic Care & Follow-Up Tracking Agent',
                '0 8 * * *',
                TRUE,
                '{"lookback_days": 30, "due_reminder_window_days": 3}'::jsonb
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, agent_type) DO NOTHING;

            INSERT INTO oh_id.ai_agents (id, hospital_id, agent_type, name, schedule_cron, is_enabled, configuration)
            SELECT
                'agent-' || h.id || '-ops',
                h.id,
                'OPERATIONS_AGENT',
                'Queue SLA & Operational Alert Agent',
                '*/15 * * * *',
                TRUE,
                '{"max_wait_time_minutes": 30, "max_queue_length": 15}'::jsonb
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, agent_type) DO NOTHING;

            INSERT INTO oh_id.ai_agents (id, hospital_id, agent_type, name, schedule_cron, is_enabled, configuration)
            SELECT
                'agent-' || h.id || '-report',
                h.id,
                'REPORT_AGENT',
                'Daily Executive Operational Summary Agent',
                '0 21 * * *',
                TRUE,
                '{"generate_pdf": false, "email_summary": true}'::jsonb
            FROM oh_id.hospitals h
            ON CONFLICT (hospital_id, agent_type) DO NOTHING;
        """)

        conn.commit()
        print("Phase 6 AI Healthcare Intelligence & Autonomous Operations Migration successfully committed.")
    except Exception as e:
        conn.rollback()
        print(f"Error during Phase 6 migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
