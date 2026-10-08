"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar, Clock, MapPin, User, Stethoscope, CheckCircle2,
  X, Search, Sparkles, Navigation, Hospital as HospitalIcon,
  ChevronRight, ArrowLeft, AlertCircle, ShieldCheck, HeartHandshake,
  Users, Check, ExternalLink, Download, Phone, Award, DollarSign,
  Activity, Smile, Thermometer, Baby, Brain, Eye, Droplet, RefreshCw
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api, SpecialtyItem, SymptomMappingItem, ProviderItem, ProviderDetailResponse, SlotItem } from "@/lib/api";
import { useFamily } from "@/lib/patient/FamilyContext";

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (appointment: any) => void;
  initialPatientId?: string;
  initialSpecialty?: string;
}

const PROBLEM_ICONS: Record<string, React.ElementType> = {
  Thermometer,
  Bone: Activity,
  Heart: Activity,
  Baby,
  Smile,
  Sparkles,
  Headphones: Activity,
  HeartHandshake,
  Eye,
  Activity,
  Droplet,
  Brain,
  Users,
};

export function AppointmentBookingModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatientId,
  initialSpecialty,
}: AppointmentBookingModalProps) {
  const { activePerson, familyMembers, primaryProfile, canAccess } = useFamily();

  // Wizard Steps:
  // 1: Select Patient (Myself / Family Member)
  // 2: Location & Search Radius
  // 3: Healthcare Requirement / Specialty / Symptom
  // 4: Choose Registered OH-ID Provider
  // 5: Choose Department & Doctor
  // 6: Choose Date & Time Slot
  // 7: Appointment Type & Reason
  // 8: Review
  // 9: Confirmed
  const [step, setStep] = useState<number>(1);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || "");
  const [locationQuery, setLocationQuery] = useState<string>("Chennai, Tamil Nadu");
  const [useGps, setUseGps] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat?: number; lon?: number }>({ lat: 13.0182, lon: 80.1654 });
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [sortBy, setSortBy] = useState<"recommended" | "nearest" | "earliest">("recommended");

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(initialSpecialty || "");
  const [specialtySearch, setSpecialtySearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [providersLoading, setProvidersLoading] = useState<boolean>(false);
  const [selectedHospital, setSelectedHospital] = useState<ProviderDetailResponse | null>(null);
  const [hospitalDetailLoading, setHospitalDetailLoading] = useState<boolean>(false);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("any");
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>("Any Available Doctor");

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [appointmentType, setAppointmentType] = useState<string>("New Consultation");
  const [reason, setReason] = useState<string>("");
  const [symptomsNotes, setSymptomsNotes] = useState<string>("");

  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  // Master Catalogs
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomMappingItem[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState<boolean>(false);

  // Initialize selected patient from context
  useEffect(() => {
    if (primaryProfile && !selectedPatientId) {
      setSelectedPatientId(primaryProfile.id);
    }
  }, [primaryProfile]);

  // Load Specialties and Symptoms Catalogs
  useEffect(() => {
    if (isOpen) {
      setCatalogsLoading(true);
      Promise.all([
        api.discovery.getSpecialties().catch(() => ({ success: true, data: [] })),
        api.discovery.getSymptoms().catch(() => ({ success: true, data: [] })),
      ]).then(([specRes, symRes]) => {
        setSpecialties(specRes?.data || []);
        setSymptoms(symRes?.data || []);
      }).finally(() => {
        setCatalogsLoading(false);
      });
    }
  }, [isOpen]);

  // Search providers whenever Location, Specialty, Radius, or Sort changes
  const searchProviders = async () => {
    setProvidersLoading(true);
    try {
      const res = await api.discovery.searchProviders({
        location: locationQuery,
        specialty: selectedSpecialty || undefined,
        latitude: useGps ? gpsCoords.lat : undefined,
        longitude: useGps ? gpsCoords.lon : undefined,
        radius_km: radiusKm,
        sort_by: sortBy,
      });
      setProviders(res?.data || []);
    } catch (err) {
      console.error("Failed to search providers", err);
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  };

  // Trigger search when navigating to provider step
  useEffect(() => {
    if (step === 4) {
      searchProviders();
    }
  }, [step, selectedSpecialty, radiusKm, sortBy]);

  // Load hospital detail and departments when hospital selected
  const handleSelectHospital = async (hospId: string) => {
    setHospitalDetailLoading(true);
    try {
      const res = await api.discovery.getProvider(hospId);
      if (res?.data) {
        setSelectedHospital(res.data);
        if (res.data.departments && res.data.departments.length > 0) {
          // Pre-select department matching specialty if possible
          const matchedDept = res.data.departments.find(d => 
            d.specialties?.some(s => s.name.toLowerCase().includes(selectedSpecialty.toLowerCase()))
          );
          setSelectedDepartmentId(matchedDept ? matchedDept.id : res.data.departments[0].id);
        }
        setSelectedDoctorId("any");
        setSelectedDoctorName("Any Available Doctor");
        setStep(5);
      }
    } catch (err) {
      console.error("Failed to load hospital details", err);
    } finally {
      setHospitalDetailLoading(false);
    }
  };

  // Load Slots when doctor, department, hospital, or date changes
  const loadSlots = async () => {
    if (!selectedHospital) return;
    setSlotsLoading(true);
    try {
      const res = await api.discovery.getSlots(
        selectedDoctorId,
        selectedDate,
        selectedHospital.id,
        selectedDepartmentId || undefined
      );
      setSlots(res?.data || []);
      // Reset selected slot if not valid
      setSelectedSlot("");
      setSelectedTime("");
    } catch (err) {
      console.error("Failed to load slots", err);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (step === 6 && selectedHospital) {
      loadSlots();
    }
  }, [step, selectedDoctorId, selectedDate, selectedDepartmentId]);

  // Handle GPS Geolocation
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setUseGps(true);
          setLocationQuery("Current Location (GPS)");
        },
        (err) => {
          console.warn("Geolocation denied, using default coordinates", err);
          setGpsCoords({ lat: 13.0182, lon: 80.1654 });
          setUseGps(true);
          setLocationQuery("Chennai (Central)");
        }
      );
    } else {
      setLocationQuery("Chennai, Tamil Nadu");
    }
  };

  // Final Confirmation Booking Action
  const handleConfirmBooking = async () => {
    if (!selectedHospital || !selectedDate || !selectedTime) return;
    setBookingLoading(true);
    setBookingError(null);

    try {
      const payload = {
        patient_id: selectedPatientId,
        hospital_id: selectedHospital.id,
        department_id: selectedDepartmentId || undefined,
        doctor_id: selectedDoctorId === "any" && slots.find(s => s.time === selectedTime)?.doctor_id 
          ? (slots.find(s => s.time === selectedTime)?.doctor_id as string) 
          : selectedDoctorId !== "any" ? selectedDoctorId : "doc-arun-kumar",
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        appointment_type: appointmentType,
        slot: `${selectedDate} ${selectedTime}`,
        reason: reason || "General Medical Consultation",
        symptoms_notes: symptomsNotes,
        priority: "NORMAL",
      };

      const res = await api.patient.bookAppointment(payload);
      if (res?.data) {
        setConfirmedAppointment(res.data);
        setStep(9);
        if (onSuccess) {
          onSuccess(res.data);
        }
      }
    } catch (err: any) {
      console.error("Booking error", err);
      setBookingError(err?.message || "Appointment booking failed. Please re-check slot availability.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Generate .ICS Calendar File
  const handleDownloadCalendar = () => {
    if (!confirmedAppointment) return;
    const startStr = `${confirmedAppointment.appointment_date || selectedDate}T10:00:00`;
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OneHealth ID//OH-ID Healthcare OS//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Doctor Appointment with Dr. ${confirmedAppointment.doctor_name || selectedDoctorName}`,
      `DESCRIPTION:OneHealth ID Appointment (${confirmedAppointment.id}) at ${confirmedAppointment.hospital_name || selectedHospital?.name}. Reason: ${confirmedAppointment.reason || reason}`,
      `LOCATION:${confirmedAppointment.hospital_name || selectedHospital?.name}, ${confirmedAppointment.hospital_area || selectedHospital?.area || "Chennai"}`,
      `DTSTART:${startStr.replace(/[-:]/g, "")}`,
      `DTEND:${startStr.replace(/[-:]/g, "")}`,
      `STATUS:CONFIRMED`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointment-${confirmedAppointment.id || "ohid"}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // Resolve target patient object for display
  const isTargetSelf = selectedPatientId === primaryProfile?.id;
  const targetFamilyMember = familyMembers.find(f => f.member_patient_id === selectedPatientId);
  const targetPatientName = isTargetSelf ? (primaryProfile?.name || "Myself") : (targetFamilyMember?.member_name || "Family Member");
  const targetPatientOhid = isTargetSelf ? primaryProfile?.onehealth_id : targetFamilyMember?.member_onehealth_id;
  const targetRelationship = isTargetSelf ? "Self" : (targetFamilyMember?.relationship || "Family");

  // Filtered Specialties
  const filteredSpecialties = specialties.filter(s => {
    if (selectedCategory !== "ALL" && s.category !== selectedCategory) return false;
    if (specialtySearch) {
      const q = specialtySearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
    }
    return true;
  });

  const categories = ["ALL", "General", "Dental", "Bone, Joint & Trauma", "Heart", "Women", "Children", "Brain & Nervous System", "Skin", "ENT", "Eye", "Kidney & Urinary", "Gastro", "Cancer", "Mental Health", "Older Adults", "Other"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-mono">
                  OH-ID Patient Discovery
                </span>
                <span className="text-xs text-slate-400">Step {step} of 8</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {step === 1 && "Who is this appointment for?"}
                {step === 2 && "Where do you want to visit?"}
                {step === 3 && "What do you need help with?"}
                {step === 4 && "Choose Registered OH-ID Provider"}
                {step === 5 && "Select Department & Doctor"}
                {step === 6 && "Select Date & Available Time"}
                {step === 7 && "Appointment Type & Reason"}
                {step === 8 && "Review Appointment Details"}
                {step === 9 && "Appointment Confirmed"}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Indicator Bar */}
        {step < 9 && (
          <div className="w-full bg-slate-100 h-1.5 flex shrink-0">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full transition-all duration-300"
              style={{ width: `${(step / 8) * 100}%` }}
            />
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* STEP 1: SELECT PERSON (MYSELF VS FAMILY MEMBER) */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-slate-600">
                  Every appointment is securely linked to the correct person's OneHealth ID.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Myself */}
                <div
                  onClick={() => setSelectedPatientId(primaryProfile?.id || "")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isTargetSelf
                      ? "border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                      👤
                    </div>
                    {isTargetSelf && (
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{primaryProfile?.name || "Myself"}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Primary Account
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">OH-ID: {primaryProfile?.onehealth_id || "OH-10000001"}</p>
                    <p className="text-[11px] text-slate-600 pt-1">Direct booking for personal health profile</p>
                  </div>
                </div>

                {/* Option 2: Family Members */}
                {familyMembers.map((fm) => {
                  const isSelected = selectedPatientId === fm.member_patient_id;
                  const canBook = fm.permissions?.book_appointments ?? true;
                  return (
                    <div
                      key={fm.id}
                      onClick={() => {
                        if (canBook) setSelectedPatientId(fm.member_patient_id);
                      }}
                      className={`p-5 rounded-2xl border-2 transition-all ${
                        !canBook 
                          ? "opacity-60 bg-slate-50 border-dashed border-slate-200 cursor-not-allowed" 
                          : isSelected
                            ? "border-amber-600 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20 cursor-pointer"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                          {fm.relationship === "SPOUSE" ? "👩" : fm.relationship === "SON" ? "👦" : fm.relationship === "MOTHER" ? "👵" : "👤"}
                        </div>
                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="mt-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{fm.member_name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            {fm.relationship}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">OH-ID: {fm.member_onehealth_id}</p>
                        <p className="text-[11px] text-slate-600 pt-1">
                          {canBook ? "✓ Authorized for family booking" : "✗ Booking permission not granted"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Family Member Quick Link */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Need to book for another family member?</span>
                </div>
                <a
                  href="/patient/family"
                  target="_blank"
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>+ Add Family Member</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: LOCATION SEARCH & RADIUS */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Where do you want to visit?</h3>
                <p className="text-xs text-slate-500">
                  Find accredited OH-ID hospitals and clinics near your home, workplace, or current location.
                </p>
              </div>

              {/* Location Input & GPS Button */}
              <div className="space-y-3">
                <div className="relative">
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      setUseGps(false);
                    }}
                    placeholder="Search city, area or PIN code (e.g. Porur, Anna Nagar, 600001, Chennai)"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>📍 Use my location</span>
                  </button>

                  {["Mugalivakkam", "Porur", "Anna Nagar", "Velachery", "Chennai Central"].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        setLocationQuery(area);
                        setUseGps(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        locationQuery.toLowerCase().includes(area.toLowerCase())
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance Radius Filter */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Distance Radius
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 3, 5, 10, 25].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadiusKm(r)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        radiusKm === r
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Within {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By Filter */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Sort Healthcare Providers
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "recommended", label: "Recommended" },
                    { id: "nearest", label: "Nearest First" },
                    { id: "earliest", label: "Earliest Slot" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortBy(s.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        sortBy === s.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: HEALTHCARE REQUIREMENT / SPECIALTY SELECTOR */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">What do you need help with?</h3>
                <p className="text-xs text-slate-500">
                  Select a medical specialty or choose from common health concerns.
                </p>
              </div>

              {/* Search Specialty */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={specialtySearch}
                  onChange={(e) => setSpecialtySearch(e.target.value)}
                  placeholder="Search specialty or clinical department (e.g. Cardiology, Orthopedics, Pediatrics)"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Common Health Concerns / Problem Chips */}
              {!specialtySearch && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Popular Health Concerns
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {symptoms.slice(0, 9).map((sym) => {
                      const isSelected = sym.specialty_names.some(sn => sn === selectedSpecialty);
                      const IconComp = PROBLEM_ICONS[sym.icon || "Activity"] || Activity;
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          onClick={() => {
                            setSelectedSpecialty(sym.specialty_names[0] || "General Medicine");
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                            isSelected
                              ? "bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate text-xs">{sym.problem_title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category Filter Chips */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Clinical Categories
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        selectedCategory === cat
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialties Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Specialties ({filteredSpecialties.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredSpecialties.map((spec) => {
                    const isSelected = selectedSpecialty === spec.name;
                    return (
                      <div
                        key={spec.id}
                        onClick={() => setSelectedSpecialty(spec.name)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? "bg-blue-50 border-blue-600 text-blue-950 font-bold shadow-xs ring-1 ring-blue-500"
                            : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">{spec.name}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{spec.description || spec.category}</p>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: REGISTERED OH-ID PROVIDER SEARCH RESULTS */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {providersLoading ? "Searching registered facilities..." : `${providers.length} Registered Healthcare Providers Found`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Near {locationQuery} • {selectedSpecialty || "All Specialties"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={searchProviders}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {providersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : providers.length > 0 ? (
                <div className="space-y-3">
                  {providers.map((hosp) => (
                    <div
                      key={hosp.id}
                      className="p-5 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm hover:shadow-md transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                              <HospitalIcon className="w-4 h-4 text-blue-600 shrink-0" />
                              {hosp.name}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {hosp.featured_badge || "✓ OH-ID Registered"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {hosp.address || `${hosp.area}, ${hosp.city}`}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                            ⭐ {hosp.rating || "4.8"}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium pt-1">
                            📍 {hosp.distance_km || "2.1"} km away
                          </p>
                        </div>
                      </div>

                      {/* Specialties chips */}
                      {hosp.specialties && hosp.specialties.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hosp.specialties.slice(0, 4).map((s, idx) => (
                            <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {s.name}
                            </span>
                          ))}
                          {hosp.specialties.length > 4 && (
                            <span className="text-[10px] font-medium text-slate-400">
                              +{hosp.specialties.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Footer: Next Available Slot & Select Button */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Next available</span>
                          <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {hosp.next_available_slot || "Today · 4:30 PM"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectHospital(hosp.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                        >
                          <span>Select Hospital</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center space-y-3">
                  <HospitalIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Registered Facilities Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No OH-ID active clinics or hospitals matched your criteria within {radiusKm} km of {locationQuery}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRadiusKm(25);
                      setSelectedSpecialty("");
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Widen Search (25 km & All Specialties)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: SELECT DEPARTMENT & DOCTOR */}
          {/* ========================================================================= */}
          {step === 5 && selectedHospital && (
            <div className="space-y-5">
              {/* Selected Hospital Header */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <HospitalIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedHospital.name}</h4>
                    <p className="text-xs text-slate-500">{selectedHospital.address || selectedHospital.area}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Department Tabs */}
              {selectedHospital.departments && selectedHospital.departments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Department
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {selectedHospital.departments.map((dept) => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setSelectedDepartmentId(dept.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                          selectedDepartmentId === dept.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {dept.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Doctors Roster */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Available Clinicians
                </span>

                {/* Option 1: Any Available Doctor */}
                <div
                  onClick={() => {
                    setSelectedDoctorId("any");
                    setSelectedDoctorName("Any Available Doctor");
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                    selectedDoctorId === "any"
                      ? "border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Any Available Doctor</h4>
                      <p className="text-xs text-slate-500">Fastest appointment with next available specialist</p>
                    </div>
                  </div>
                  {selectedDoctorId === "any" && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Option 2: Specific Doctors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {selectedHospital.doctors
                    ?.filter(d => !selectedDepartmentId || d.department_id === selectedDepartmentId)
                    .map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setSelectedDoctorName(doc.name);
                          }}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition space-y-2 ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                👨‍⚕️
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{doc.name}</h4>
                                <p className="text-[11px] text-slate-600 font-medium">{doc.specialty}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span>{doc.qualification} • {doc.experience_years}+ yrs exp</span>
                            <span className="font-bold text-amber-700">⭐ {doc.rating || "4.9"}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: DATE & TIME SLOT SELECTION */}
          {/* ========================================================================= */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Select Date & Time</h3>
                <p className="text-xs text-slate-500">
                  Doctor availability is validated in real-time from the backend.
                </p>
              </div>

              {/* Date Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Appointment Date
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((offset) => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const iso = d.toISOString().split("T")[0];
                    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                    const dateNum = d.getDate();
                    const monthName = d.toLocaleDateString("en-US", { month: "short" });
                    const isSelected = selectedDate === iso;

                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedDate(iso)}
                        className={`p-3 rounded-2xl border text-center min-w-[72px] transition ${
                          isSelected
                            ? "bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className={`text-[10px] font-bold uppercase ${isSelected ? "text-cyan-200" : "text-slate-400"}`}>
                          {offset === 0 ? "Today" : offset === 1 ? "Tmrw" : dayName}
                        </p>
                        <p className="text-lg font-bold">{dateNum}</p>
                        <p className={`text-[10px] ${isSelected ? "text-slate-200" : "text-slate-500"}`}>{monthName}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots Grid */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Available Time Slots ({slots.filter(s => s.is_available).length} open)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Slot duration: 30 mins</span>
                </div>

                {slotsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : slots.length > 0 ? (
                  <div className="space-y-4">
                    {/* Morning Slots */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Morning Slots</span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {slots.filter(s => s.session === "MORNING").map((slot, idx) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!slot.is_available}
                              onClick={() => {
                                setSelectedTime(slot.time);
                                setSelectedSlot(slot.slot_value);
                              }}
                              className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                                !slot.is_available
                                  ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                                  : isSelected
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                    : "bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Evening Slots */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Evening Slots</span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {slots.filter(s => s.session === "EVENING").map((slot, idx) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!slot.is_available}
                              onClick={() => {
                                setSelectedTime(slot.time);
                                setSelectedSlot(slot.slot_value);
                              }}
                              className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                                !slot.is_available
                                  ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                                  : isSelected
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                    : "bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    No available time slots found for this date. Try choosing another day.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 7: APPOINTMENT TYPE & REASON */}
          {/* ========================================================================= */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Appointment Type & Reason</h3>
                <p className="text-xs text-slate-500">
                  Select consultation category and add notes for the hospital reception and doctor.
                </p>
              </div>

              {/* Appointment Types */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Appointment Type
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    "New Consultation",
                    "Follow-up",
                    "Review",
                    "Second Opinion",
                    "Lab / Diagnostic",
                    "Vaccination",
                    "Procedure",
                    "Other",
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAppointmentType(t)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        appointmentType === t
                          ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 text-xs font-semibold"
                      }`}
                    >
                      <p className="text-xs truncate">{t}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason for Visit */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Reason for Visit
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Chest heaviness, knee pain, routine diabetes checkup"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>

              {/* Optional Symptoms / Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Symptoms / Clinical Notes
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <textarea
                  value={symptomsNotes}
                  onChange={(e) => setSymptomsNotes(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe any symptoms, onset duration, or current medications..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 8: REVIEW APPOINTMENT BEFORE CONFIRMATION */}
          {/* ========================================================================= */}
          {step === 8 && selectedHospital && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Please review your booking details. The appointment will be registered on the OneHealth ID network.
                </span>
              </div>

              {bookingError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
                {/* Patient Information */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{targetPatientName}</h4>
                    <p className="font-mono text-slate-500 text-[11px]">OH-ID: {targetPatientOhid || "OH-10000001"}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isTargetSelf ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-900"
                  }`}>
                    {targetRelationship}
                  </span>
                </div>

                {/* Booked By (for Family Audit Trail) */}
                {!isTargetSelf && (
                  <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Booked By</span>
                      <p className="font-bold text-slate-800">{primaryProfile?.name || "Account Holder"}</p>
                    </div>
                    <span className="text-[11px] text-slate-500">Authorized Guardian Access</span>
                  </div>
                )}

                {/* Hospital & Department */}
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital</span>
                    <h4 className="font-bold text-slate-900">{selectedHospital.name}</h4>
                    <p className="text-slate-500 text-[11px]">{selectedHospital.area}, {selectedHospital.city}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                    <h4 className="font-bold text-slate-900">
                      {selectedHospital.departments.find(d => d.id === selectedDepartmentId)?.name || selectedSpecialty || "General OPD"}
                    </h4>
                  </div>
                </div>

                {/* Doctor & Schedule */}
                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor</span>
                    <h4 className="font-bold text-slate-900">{selectedDoctorName}</h4>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Date & Time</span>
                    <h4 className="font-bold text-blue-900">{selectedDate} • {selectedTime}</h4>
                  </div>
                </div>

                {/* Type & Reason */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Appointment Type</span>
                    <p className="font-bold text-slate-900">{appointmentType}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Reason</span>
                    <p className="font-medium text-slate-700">{reason || "Regular Consultation"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 9: APPOINTMENT CONFIRMED SUCCESS VIEW */}
          {/* ========================================================================= */}
          {step === 9 && confirmedAppointment && (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">✓ Appointment Confirmed</h3>
                <p className="text-xs text-slate-500">
                  Booking registered against {targetPatientName}'s OneHealth ID
                </p>
              </div>

              {/* Pass Card with QR */}
              <div className="max-w-md mx-auto p-6 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl shadow-xl space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Appointment ID</span>
                    <p className="font-mono font-bold text-white text-base">{confirmedAppointment.id}</p>
                  </div>
                  {confirmedAppointment.token_number && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase">OPD Token</span>
                      <p className="text-lg font-black text-cyan-400">#{confirmedAppointment.token_number}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Patient</span>
                      <p className="font-bold text-white text-sm">{confirmedAppointment.patient_name || targetPatientName}</p>
                      <p className="text-[11px] font-mono text-cyan-300">{confirmedAppointment.onehealth_id || targetPatientOhid}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px]">Doctor & Hospital</span>
                      <p className="font-bold text-white">{confirmedAppointment.doctor_name || selectedDoctorName}</p>
                      <p className="text-[11px] text-slate-300">{confirmedAppointment.hospital_name || selectedHospital?.name}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px]">Date & Time</span>
                      <p className="font-bold text-emerald-400">{confirmedAppointment.slot || `${selectedDate} ${selectedTime}`}</p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="p-2.5 bg-white rounded-2xl shrink-0 shadow-md">
                    <QRCodeSVG
                      value={confirmedAppointment.checkin_token || confirmedAppointment.id}
                      size={90}
                      level="H"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto pt-2">
                <button
                  type="button"
                  onClick={handleDownloadCalendar}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add to Calendar</span>
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHospital?.name || "Hospital")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Get Directions</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.href = "/patient/appointments";
                  }}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <HospitalIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>View All Appts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setConfirmedAppointment(null);
                  }}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Book Another</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step > 1 && step < 9 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 8 && (
            <button
              type="button"
              disabled={
                (step === 1 && !selectedPatientId) ||
                (step === 2 && !locationQuery) ||
                (step === 3 && !selectedSpecialty) ||
                (step === 4 && !selectedHospital) ||
                (step === 6 && !selectedTime)
              }
              onClick={() => {
                if (step === 3) {
                  setStep(4);
                } else if (step === 5) {
                  setStep(6);
                } else {
                  setStep(step + 1);
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <span>Continue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 8 && (
            <button
              type="button"
              disabled={bookingLoading}
              onClick={handleConfirmBooking}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
            >
              {bookingLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Reserving Slot...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Appointment</span>
                </>
              )}
            </button>
          )}

          {step === 9 && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
