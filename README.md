# Hospital Management System Backend

This workspace contains a simple FastAPI backend for a hospital management system.

## Run locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

## API overview

- `GET /` - API welcome message
- `GET /health` - health check
- `GET /patients` - list patients
- `POST /patients` - create a patient
- `GET /patients/{patient_id}` - fetch a patient
- `GET /doctors` - list doctors
- `POST /doctors` - create a doctor
- `GET /doctors/{doctor_id}` - fetch a doctor
- `GET /appointments` - list appointments
- `POST /appointments` - create an appointment
