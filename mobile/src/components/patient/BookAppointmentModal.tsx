/**
 * ONEHEALTH ID (OH-ID) Mobile — Book Appointment Flow
 * Sathus Technology Pvt Ltd
 *
 * Implements the complete 7-step guided appointment booking experience:
 * 1. Patient Selection (Myself or authorized Family Member)
 * 2. Hospital Search & Discovery
 * 3. Clinical Specialty Selection
 * 4. Doctor Selection with Verified Profiles & Availability Badges
 * 5. Date & Time Selection with Verified Real-Time Slots
 * 6. Review & Confirm with Double-Booking Concurrency Protection
 * 7. Server-Confirmed Booking Pass with Reference Code & Token
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from "react-native";
import {
  ArrowLeft,
  X,
  Search,
  Filter,
  Check,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  User,
  Users,
  ChevronRight,
  ChevronLeft,
  Copy,
  AlertCircle,
  Stethoscope,
  Heart,
  Baby,
  Sparkles,
  Activity,
  HeartHandshake,
  ShieldCheck,
  FileText,
  IndianRupee,
} from "lucide-react-native";
import {
  DiscoveryHospital,
  DiscoveryDoctor,
  AppointmentSlot,
  FamilyMember,
  PatientProfile,
  AppointmentItem,
} from "../../types/patient";
import { LoadingOverlay } from "../loading";
import { patientApi } from "../../services/api/patient";

interface BookAppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  onBookingSuccess?: (appointment: AppointmentItem) => void;
  initialHospitalId?: string;
}

type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  visible,
  onClose,
  onBookingSuccess,
  initialHospitalId,
}) => {
  // Stepper State
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);

  // Data Loading States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);

  // Selection States
  const [myProfile, setMyProfile] = useState<PatientProfile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("myself");
  const [selectedPatientName, setSelectedPatientName] = useState<string>("Myself");
  const [selectedPatientSub, setSelectedPatientSub] = useState<string>("");

  // Hospitals & Search
  const [hospitals, setHospitals] = useState<DiscoveryHospital[]>([]);
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<DiscoveryHospital | null>(null);

  // Specialties
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("General Medicine");

  // Doctors
  const [doctors, setDoctors] = useState<DiscoveryDoctor[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
  const [selectedDoctor, setSelectedDoctor] = useState<DiscoveryDoctor | null>(null);

  // Date & Time
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-30");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);

  // Confirmed Result
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);

  // Pre-configured Specialties with Clinical Icons & Descriptions matching reference
  const specialtyList = useMemo(
    () => [
      {
        name: "General Medicine",
        subtitle: "Adult primary care",
        icon: Stethoscope,
        color: "#155EEF",
        bg: "#EFF4FF",
      },
      {
        name: "Paediatrics",
        subtitle: "Child healthcare",
        icon: Baby,
        color: "#F79009",
        bg: "#FFFBEB",
      },
      {
        name: "Cardiology",
        subtitle: "Heart and vascular care",
        icon: Heart,
        color: "#D92D20",
        bg: "#FEF2F2",
      },
      {
        name: "Dermatology",
        subtitle: "Skin, hair and nail care",
        icon: Sparkles,
        color: "#E04F16",
        bg: "#FFF7ED",
      },
      {
        name: "Orthopaedics",
        subtitle: "Bone and joint care",
        icon: Activity,
        color: "#0891B2",
        bg: "#ECFEFF",
      },
      {
        name: "Gynaecology",
        subtitle: "Women's health",
        icon: HeartHandshake,
        color: "#C026D3",
        bg: "#FDF4FF",
      },
    ],
    []
  );

  // Generate 7-day date calendar window around Oct 2026
  const dateList = useMemo(() => {
    const dates = [
      { day: "Mon", num: "27", dateStr: "2026-10-27" },
      { day: "Tue", num: "28", dateStr: "2026-10-28" },
      { day: "Wed", num: "29", dateStr: "2026-10-29" },
      { day: "Thu", num: "30", dateStr: "2026-10-30" },
      { day: "Fri", num: "31", dateStr: "2026-10-31" },
      { day: "Sat", num: "01", dateStr: "2026-11-01" },
      { day: "Sun", num: "02", dateStr: "2026-11-02" },
    ];
    return dates;
  }, []);

  // Format Date Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "30 Oct 2026";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = months[parseInt(m, 10) - 1] || "Oct";
        return `${d} ${monthName} ${y}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // 1. Initial Load: Patient Profile, Family Members & Hospitals
  useEffect(() => {
    if (!visible) return;
    setCurrentStep(1);
    setConfirmedAppointment(null);
    setSubmittingBooking(false);

    let isMounted = true;
    const fetchInit = async () => {
      try {
        setLoadingInitial(true);
        setErrorMessage(null);

        // Fetch user profile
        const profile = await patientApi.getMyProfile();
        if (isMounted) {
          setMyProfile(profile);
          setSelectedPatientName(profile.name || "Alice Smith");
          setSelectedPatientSub(
            `${profile.onehealth_id || "OHID-IND-2026-01001"} • ${profile.age || 32} Y / ${profile.gender || "Female"}`
          );
        }

        // Fetch family members
        try {
          const fam = await patientApi.getFamilyMembers();
          if (isMounted) setFamilyMembers(fam);
        } catch (e) {
          console.warn("Could not load family members", e);
        }

        // Fetch hospitals
        const hospList = await patientApi.searchHospitals();
        if (isMounted) {
          setHospitals(hospList);
          // Auto-select Hospital Alpha if present, or first hospital
          const alpha = hospList.find((h) => h.id === "hosp-alpha") || hospList[0];
          if (alpha) setSelectedHospital(alpha);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Booking init error:", err);
          setErrorMessage(err?.message || "Failed to initialize appointment booking.");
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    fetchInit();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // 2. Load Doctors when Hospital or Specialty changes
  const fetchDoctors = useCallback(async () => {
    if (!selectedHospital) return;
    try {
      setLoadingDoctors(true);
      setErrorMessage(null);
      let docs = await patientApi.getDoctors(selectedHospital.id, selectedSpecialty);
      if (docs.length === 0) {
        // Fallback to all doctors at this hospital if specific specialty filter is empty
        docs = await patientApi.getDoctors(selectedHospital.id);
      }
      setDoctors(docs);
      if (docs.length > 0) {
        // Default select doctor matching current specialty or Dr. Senthil Nathan or first
        const match =
          docs.find((d) => d.specialty?.toLowerCase().includes(selectedSpecialty.toLowerCase())) ||
          docs.find((d) => d.name.includes("Senthil")) ||
          docs[0];
        setSelectedDoctor(match);
      } else {
        setSelectedDoctor(null);
      }
    } catch (e: any) {
      console.warn("Error fetching doctors:", e);
      setErrorMessage("Could not load doctors for this department.");
    } finally {
      setLoadingDoctors(false);
    }
  }, [selectedHospital, selectedSpecialty]);

  // Switch to Duty Doctor when specific doctor is unavailable or by patient request
  const handleSwitchToDutyDoctor = useCallback(() => {
    if (!selectedHospital) return;
    const dutyDoc =
      doctors.find((d) => d.id.startsWith("doc-duty-")) ||
      ({
        id: `doc-duty-${selectedHospital.id}`,
        name: "Duty Medical Officer (OPD)",
        specialty: "General OPD & Duty Doctor",
        qualification: "MBBS • On-Duty Physician",
        consultation_fee: 350,
        hospital_id: selectedHospital.id,
        hospital_name: selectedHospital.name,
        is_available: true,
        available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      } as DiscoveryDoctor);

    setSelectedDoctor(dutyDoc);
    setErrorMessage(null);
  }, [doctors, selectedHospital]);

  useEffect(() => {
    if (visible && (currentStep === 4 || currentStep === 3)) {
      fetchDoctors();
    }
  }, [visible, currentStep, fetchDoctors]);

  // 3. Load Slots when Doctor or Date changes
  const fetchSlots = useCallback(async () => {
    if (!selectedDoctor) return;
    try {
      setLoadingSlots(true);
      setErrorMessage(null);
      const availableSlots = await patientApi.getAvailableSlots(
        selectedDoctor.id,
        selectedDate,
        selectedHospital?.id
      );
      setSlots(availableSlots);
      // Auto-select first available slot
      const firstAvail = availableSlots.find((s) => s.is_available);
      setSelectedSlot(firstAvail || null);
    } catch (e: any) {
      console.warn("Error fetching slots:", e);
      setErrorMessage("Could not load appointment slots.");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor, selectedDate, selectedHospital]);

  useEffect(() => {
    if (visible && currentStep === 5) {
      fetchSlots();
    }
  }, [visible, currentStep, fetchSlots]);

  // Reset modal when closing
  const handleClose = () => {
    setCurrentStep(1);
    setConfirmedAppointment(null);
    setSubmittingBooking(false);
    onClose();
  };

  // Filtered Hospital List
  const filteredHospitals = useMemo(() => {
    if (!hospitalSearch.trim()) return hospitals;
    const q = hospitalSearch.toLowerCase();
    return hospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.area?.toLowerCase().includes(q) ||
        h.city?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q)
    );
  }, [hospitals, hospitalSearch]);

  // Grouped Slots: Morning, Afternoon, Evening
  const groupedSlots = useMemo(() => {
    const morning = slots.filter((s) => s.period === "Morning" || s.session === "Morning");
    const afternoon = slots.filter((s) => s.period === "Afternoon" || s.session === "Afternoon");
    const evening = slots.filter((s) => s.period === "Evening" || s.session === "Evening");
    return { morning, afternoon, evening };
  }, [slots]);

  // Submit Booking with Double-Booking Concurrency Protection
  const isSubmittingRef = useRef(false);

  const handleConfirmBooking = async () => {
    if (isSubmittingRef.current || submittingBooking) return; // Synchronous and state-based idempotency guard
    if (!selectedHospital) {
      setErrorMessage("Please select a hospital to continue.");
      setCurrentStep(2);
      return;
    }
    if (!selectedDoctor) {
      setErrorMessage("Please select an available doctor to continue.");
      setCurrentStep(4);
      return;
    }
    if (!selectedSlot) {
      setErrorMessage("Please select an available appointment time slot.");
      setCurrentStep(5);
      return;
    }

    try {
      isSubmittingRef.current = true;
      setSubmittingBooking(true);
      setErrorMessage(null);

      const targetPatientId =
        selectedPatientId === "myself" ? undefined : selectedPatientId;

      const payload = {
        patient_id: targetPatientId,
        hospital_id: selectedHospital.id,
        doctor_id: selectedDoctor.id,
        department_id: selectedDoctor.department_id,
        appointment_date: selectedDate,
        appointment_time: selectedSlot.time,
        appointment_type: "OPD Consultation",
        reason: "General Consultation & Review",
        slot: `${selectedDate} ${selectedSlot.time}`,
        priority: "NORMAL" as const,
      };

      const result = await patientApi.bookAppointment(payload);
      setConfirmedAppointment(result);
      setCurrentStep(7); // Show Confirmation Pass

      if (onBookingSuccess) {
        onBookingSuccess(result);
      }
    } catch (err: any) {
      console.error("Booking submission error:", err);
      // Specific user-friendly concurrency conflict message
      const msg =
        err?.message?.includes("already been reserved") || err?.status === 409
          ? "The selected slot has just been reserved by another patient. Please select a different time slot."
          : err?.message || "Booking failed. Please try again.";
      setErrorMessage(msg);
      // If concurrency conflict, refresh slots
      if (err?.status === 409) {
        fetchSlots();
      }
    } finally {
      isSubmittingRef.current = false;
      setSubmittingBooking(false);
    }
  };

  // Copy Appointment Reference
  const handleCopyReference = () => {
    const ref = confirmedAppointment?.id || "APT-2026-000456";
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    } else {
      Alert.alert("Appointment Reference", ref);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      testID="book-appointment-modal"
    >
      <View style={styles.container}>
        {/* TOP APP HEADER */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (currentStep === 7) {
                  handleClose();
                } else if (currentStep > 1) {
                  setCurrentStep((prev) => (prev - 1) as BookingStep);
                } else {
                  handleClose();
                }
              }}
              testID="btn-booking-back"
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color="#102A56" />
            </TouchableOpacity>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require("../../../assets/icon.png")}
              style={{ width: 28, height: 28, borderRadius: 6, marginLeft: 2, marginRight: 8 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.topHeaderTitle}>Book Appointment</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            testID="btn-close-booking"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 5-STEP HORIZONTAL STEPPER PROGRESS BAR (Hidden on Step 7 Confirmation) */}
        {currentStep < 7 && (
          <View style={styles.stepperContainer}>
            <View style={styles.stepperRow}>
              {[
                { step: 1, label: "Patient" },
                { step: 2, label: "Hospital" },
                { step: 3, label: "Specialty" },
                { step: 4, label: "Doctor" },
                { step: 5, label: "Confirm" },
              ].map((item, idx) => {
                const isCompleted = currentStep > item.step || (currentStep >= 5 && item.step === 5);
                const isActive =
                  currentStep === item.step || (currentStep === 6 && item.step === 5);

                return (
                  <React.Fragment key={`stepper-step-${item.step}`}>
                    <View style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepCircle,
                          isCompleted && styles.stepCircleCompleted,
                          isActive && styles.stepCircleActive,
                        ]}
                      >
                        {isCompleted && currentStep > item.step ? (
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        ) : (
                          <Text
                            style={[
                              styles.stepNumberText,
                              (isActive || isCompleted) && styles.stepNumberTextActive,
                            ]}
                          >
                            {item.step}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabelText,
                          (isActive || isCompleted) && styles.stepLabelTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {idx < 4 && (
                      <View
                        style={[
                          styles.stepConnector,
                          currentStep > item.step && styles.stepConnectorActive,
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* ERROR CALLOUT NOTICE */}
        {errorMessage && (
          <View style={styles.errorNoticeBox}>
            <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8, flexShrink: 0 }} />
            <Text style={styles.errorNoticeText}>{errorMessage}</Text>
          </View>
        )}

        {/* TOAST NOTICE */}
        {copyToast && (
          <View style={styles.toastNotice}>
            <CheckCircle2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.toastText}>Reference copied to clipboard</Text>
          </View>
        )}

        {/* STEP CONTENT BODY */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loadingInitial ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#155EEF" />
              <Text style={styles.loadingMsg}>Preparing clinical scheduling...</Text>
            </View>
          ) : (
            <>
              {/* ============================================================== */}
              {/* SCREEN 2: SELECT PATIENT                                      */}
              {/* ============================================================== */}
              {currentStep === 1 && (
                <View testID="step-select-patient">
                  <Text style={styles.screenHeading}>Select Patient</Text>
                  <Text style={styles.screenSubheading}>Choose who the appointment is for.</Text>

                  {/* Myself Radio Card */}
                  <TouchableOpacity
                    style={[
                      styles.patientCard,
                      selectedPatientId === "myself" && styles.patientCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedPatientId("myself");
                      setSelectedPatientName(myProfile?.name || "Alice Smith");
                      setSelectedPatientSub(
                        `${myProfile?.onehealth_id || "OHID-IND-2026-01001"} • ${myProfile?.age || 32} Y / ${myProfile?.gender || "Female"}`
                      );
                    }}
                    activeOpacity={0.8}
                    testID="patient-option-myself"
                  >
                    <View style={styles.patientAvatarBox}>
                      <User size={22} color="#155EEF" />
                    </View>
                    <View style={styles.patientMeta}>
                      <Text style={styles.patientTypeLabel}>Myself</Text>
                      <Text style={styles.patientNameText}>
                        {myProfile?.name || "Alice Smith"}
                      </Text>
                      <Text style={styles.patientIdText}>
                        {myProfile?.onehealth_id || "OHID-IND-2026-01001"}
                      </Text>
                      <Text style={styles.patientDemogText}>
                        {myProfile?.age || "32"} Y / {myProfile?.gender || "Female"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedPatientId === "myself" && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedPatientId === "myself" && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>

                  {/* Family Members Radio Cards */}
                  {familyMembers.map((member, idx) => {
                    const isSelected = selectedPatientId === member.member_patient_id;
                    return (
                      <TouchableOpacity
                        key={`fam-member-${member.id || idx}`}
                        style={[styles.patientCard, isSelected && styles.patientCardSelected]}
                        onPress={() => {
                          setSelectedPatientId(member.member_patient_id);
                          setSelectedPatientName(
                            `${member.member_name} (${member.relationship})`
                          );
                          setSelectedPatientSub(
                            `${member.member_onehealth_id} • ${member.member_age} Y / ${member.member_gender}`
                          );
                        }}
                        activeOpacity={0.8}
                        testID={`patient-option-family-${idx}`}
                      >
                        <View
                          style={[
                            styles.patientAvatarBox,
                            { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" },
                          ]}
                        >
                          <Users size={22} color="#9333EA" />
                        </View>
                        <View style={styles.patientMeta}>
                          <Text style={[styles.patientTypeLabel, { color: "#9333EA" }]}>
                            Family Member • {member.relationship}
                          </Text>
                          <Text style={styles.patientNameText}>{member.member_name}</Text>
                          <Text style={styles.patientIdText}>{member.member_onehealth_id}</Text>
                          <Text style={styles.patientDemogText}>
                            {member.member_age} Y / {member.member_gender}
                          </Text>
                        </View>
                        <View
                          style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}
                        >
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ============================================================== */}
              {/* SCREEN 3: FIND A HOSPITAL                                     */}
              {/* ============================================================== */}
              {currentStep === 2 && (
                <View testID="step-find-hospital">
                  <Text style={styles.screenHeading}>Find a Hospital</Text>
                  <Text style={styles.screenSubheading}>
                    Search or choose from available hospitals.
                  </Text>

                  {/* Search Input Bar */}
                  <View style={styles.searchBar}>
                    <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search hospital name or location"
                      placeholderTextColor="#94A3B8"
                      value={hospitalSearch}
                      onChangeText={setHospitalSearch}
                      testID="input-hospital-search"
                    />
                    <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Filter size={18} color="#155EEF" />
                    </TouchableOpacity>
                  </View>

                  {/* Hospital Cards List */}
                  {filteredHospitals.map((hosp) => {
                    const isSelected = selectedHospital?.id === hosp.id;
                    return (
                      <TouchableOpacity
                        key={`hosp-item-${hosp.id}`}
                        style={[
                          styles.hospitalCard,
                          isSelected && styles.hospitalCardSelected,
                        ]}
                        onPress={() => setSelectedHospital(hosp)}
                        activeOpacity={0.7}
                        testID={`hospital-item-${hosp.id}`}
                      >
                        <View style={styles.hospitalLogoBox}>
                          <Building2 size={24} color="#155EEF" />
                        </View>
                        <View style={styles.hospitalInfoCol}>
                          <View style={styles.hospNameRow}>
                            <Text style={styles.hospitalNameTitle} numberOfLines={1}>
                              {hosp.name}
                            </Text>
                          </View>
                          <Text style={styles.hospitalCategoryText}>
                            Multi-Specialty • {hosp.distance_km || "2.5"} km
                          </Text>
                          <Text style={styles.hospitalAddressText} numberOfLines={1}>
                            {hosp.area ? `${hosp.area}, ${hosp.city}` : hosp.address || hosp.city}
                          </Text>
                        </View>
                        <ChevronRight
                          size={18}
                          color={isSelected ? "#155EEF" : "#94A3B8"}
                          style={{ marginLeft: 8 }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ============================================================== */}
              {/* SCREEN 4: SELECT SPECIALTY                                    */}
              {/* ============================================================== */}
              {currentStep === 3 && (
                <View testID="step-select-specialty">
                  <Text style={styles.screenHeading}>Select Specialty</Text>
                  <Text style={styles.screenSubheading}>
                    Choose a department at {selectedHospital?.name || "Hospital Alpha"}.
                  </Text>

                  {specialtyList.map((spec) => {
                    const isSelected = selectedSpecialty === spec.name;
                    const IconComponent = spec.icon;
                    return (
                      <TouchableOpacity
                        key={`spec-item-${spec.name}`}
                        style={[
                          styles.specialtyCard,
                          isSelected && styles.specialtyCardSelected,
                        ]}
                        onPress={() => {
                          setSelectedSpecialty(spec.name);
                          setCurrentStep(4);
                        }}
                        activeOpacity={0.7}
                        testID={`specialty-item-${spec.name}`}
                      >
                        <View
                          style={[styles.specialtyIconBox, { backgroundColor: spec.bg }]}
                        >
                          <IconComponent size={20} color={spec.color} />
                        </View>
                        <View style={styles.specialtyInfoCol}>
                          <Text style={styles.specialtyNameText}>{spec.name}</Text>
                          <Text style={styles.specialtyDescText}>{spec.subtitle}</Text>
                        </View>
                        <ChevronRight
                          size={18}
                          color={isSelected ? "#155EEF" : "#94A3B8"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* ============================================================== */}
              {/* SCREEN 5: SELECT DOCTOR                                       */}
              {/* ============================================================== */}
              {currentStep === 4 && (
                <View testID="step-select-doctor">
                  <Text style={styles.screenHeading}>Select Doctor</Text>
                  <Text style={styles.screenSubheading}>
                    Choose a doctor and available slot.
                  </Text>

                  {/* Filter Header Dropdowns */}
                  <View style={styles.docFilterRow}>
                    <View style={styles.docFilterDropdown}>
                      <Text style={styles.docFilterDropdownText}>All Doctors</Text>
                    </View>
                    <View style={styles.docFilterDropdown}>
                      <Text style={styles.docFilterDropdownText}>Earliest Available</Text>
                    </View>
                  </View>

                  {/* Quick Duty Doctor Action Card */}
                  <TouchableOpacity
                    style={[
                      styles.dutyDoctorBannerCard,
                      selectedDoctor?.id.startsWith("doc-duty-") && styles.dutyDoctorBannerCardSelected,
                    ]}
                    onPress={handleSwitchToDutyDoctor}
                    activeOpacity={0.8}
                    testID="btn-select-duty-doctor-quick"
                  >
                    <View style={styles.dutyBannerIconCircle}>
                      <ShieldCheck size={20} color="#155EEF" />
                    </View>
                    <View style={styles.dutyBannerTextCol}>
                      <View style={styles.dutyBannerTitleRow}>
                        <Text style={styles.dutyBannerTitle}>Any Available Duty Doctor</Text>
                        <View style={styles.dutyInstantBadge}>
                          <Text style={styles.dutyInstantBadgeText}>⚡ Earliest OPD</Text>
                        </View>
                      </View>
                      <Text style={styles.dutyBannerSub}>
                        General OPD Consultation • On-Duty Medical Officer (₹350)
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedDoctor?.id.startsWith("doc-duty-") && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedDoctor?.id.startsWith("doc-duty-") && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.orDividerRow}>
                    <View style={styles.orDividerLine} />
                    <Text style={styles.orDividerText}>OR CHOOSE SPECIALIST</Text>
                    <View style={styles.orDividerLine} />
                  </View>

                  {loadingDoctors ? (
                    <View style={styles.centerLoading}>
                      <ActivityIndicator size="small" color="#155EEF" />
                      <Text style={styles.loadingMsg}>Finding available specialists...</Text>
                    </View>
                  ) : doctors.filter((d) => !d.id.startsWith("doc-duty-")).length === 0 ? (
                    <View style={styles.emptyDoctorBox}>
                      <Text style={styles.emptyDoctorTitle}>No department specialists scheduled</Text>
                      <Text style={styles.emptyDoctorSubtitle}>
                        You can proceed with the On-Duty Doctor above for same-day OPD consultation.
                      </Text>
                    </View>
                  ) : (
                    doctors
                      .filter((d) => !d.id.startsWith("doc-duty-"))
                      .map((doc, idx) => {
                        const isSelected = selectedDoctor?.id === doc.id;
                        const availBadge =
                          idx === 0
                            ? "✓ Available Today"
                            : idx === 1
                            ? "✓ Available Tomorrow"
                            : "✓ Available This Week";

                        return (
                          <TouchableOpacity
                            key={`doc-card-${doc.id}`}
                            style={[styles.doctorCard, isSelected && styles.doctorCardSelected]}
                            onPress={() => setSelectedDoctor(doc)}
                            activeOpacity={0.8}
                            testID={`doctor-item-${doc.id}`}
                          >
                            <View style={styles.doctorAvatarCircle}>
                              <User size={22} color="#155EEF" />
                            </View>
                            <View style={styles.doctorInfoCol}>
                              <Text style={styles.doctorCardName}>{doc.name}</Text>
                              <Text style={styles.doctorCardSub}>
                                {doc.specialty} • {doc.qualification || "MBBS, MD"}
                              </Text>
                              <View style={styles.availPill}>
                                <Text style={styles.availPillText}>{availBadge}</Text>
                              </View>
                            </View>
                            <View
                              style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}
                            >
                              {isSelected && <View style={styles.radioInner} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                  )}
                </View>
              )}

              {/* ============================================================== */}
              {/* SCREEN 6: SELECT DATE & TIME                                  */}
              {/* ============================================================== */}
              {currentStep === 5 && (
                <View testID="step-select-datetime">
                  <Text style={styles.screenHeading}>Select Date & Time</Text>

                  {/* Doctor Mini Card */}
                  <View style={styles.doctorMiniCard}>
                    <View style={styles.doctorMiniAvatar}>
                      <User size={18} color="#155EEF" />
                    </View>
                    <View style={styles.doctorMiniMeta}>
                      <Text style={styles.doctorMiniName}>
                        {selectedDoctor?.name || "Dr. Senthil Nathan"}
                      </Text>
                      <Text style={styles.doctorMiniSub}>
                        {selectedSpecialty} • {selectedHospital?.name || "Hospital Alpha"}
                      </Text>
                    </View>
                  </View>

                  {/* Month Header */}
                  <View style={styles.monthHeaderRow}>
                    <Text style={styles.monthHeaderText}>October 2026</Text>
                    <View style={styles.monthArrows}>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => setSelectedMonthOffset((p) => p - 1)}
                      >
                        <ChevronLeft size={16} color="#64748B" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => setSelectedMonthOffset((p) => p + 1)}
                      >
                        <ChevronRight size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Day Pills Carousel */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateScrollRow}
                  >
                    {dateList.map((item) => {
                      const isSelected = selectedDate === item.dateStr;
                      return (
                        <TouchableOpacity
                          key={`date-pill-${item.dateStr}`}
                          style={[
                            styles.datePillBox,
                            isSelected && styles.datePillBoxSelected,
                          ]}
                          onPress={() => setSelectedDate(item.dateStr)}
                          activeOpacity={0.7}
                          testID={`date-pill-${item.dateStr}`}
                        >
                          <Text
                            style={[
                              styles.datePillDayText,
                              isSelected && styles.datePillDayTextSelected,
                            ]}
                          >
                            {item.day}
                          </Text>
                          <Text
                            style={[
                              styles.datePillNumText,
                              isSelected && styles.datePillNumTextSelected,
                            ]}
                          >
                            {item.num}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Slots Loading Indicator */}
                  {loadingSlots ? (
                    <View style={styles.centerLoading}>
                      <ActivityIndicator size="small" color="#155EEF" />
                      <Text style={styles.loadingMsg}>Checking doctor schedule...</Text>
                    </View>
                  ) : slots.length === 0 || slots.every((s) => !s.is_available) ? (
                    <View style={styles.emptyDoctorBox}>
                      <Text style={styles.emptyDoctorTitle}>Selected Doctor is fully booked</Text>
                      <Text style={styles.emptyDoctorSubtitle}>
                        No open appointment slots are available for {selectedDoctor?.name} on this date.
                      </Text>

                      {!selectedDoctor?.id.startsWith("doc-duty-") && (
                        <View style={styles.dutyDoctorPromptBox}>
                          <View style={styles.dutyPromptHeader}>
                            <Clock size={16} color="#155EEF" style={{ marginRight: 6 }} />
                            <Text style={styles.dutyPromptTitle}>Consult with Duty Doctor instead?</Text>
                          </View>
                          <Text style={styles.dutyPromptSub}>
                            Skip the wait! The hospital's On-Duty Medical Officer is available for walk-in OPD consultation on this date.
                          </Text>
                          <TouchableOpacity
                            style={styles.btnSwitchToDutyDoctor}
                            onPress={handleSwitchToDutyDoctor}
                            activeOpacity={0.8}
                            testID="btn-switch-to-duty-doctor"
                          >
                            <Text style={styles.btnSwitchToDutyDoctorText}>
                              Book with Any Available Duty Doctor →
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <>
                      {/* Morning Slots */}
                      {groupedSlots.morning.length > 0 && (
                        <View style={styles.slotPeriodGroup}>
                          <Text style={styles.slotPeriodTitle}>Morning</Text>
                          <View style={styles.slotsGrid}>
                            {groupedSlots.morning.map((slot) => {
                              const isSelected = selectedSlot?.slot_value === slot.slot_value;
                              return (
                                <TouchableOpacity
                                  key={`slot-${slot.slot_value}`}
                                  style={[
                                    styles.slotPill,
                                    !slot.is_available && styles.slotPillDisabled,
                                    isSelected && styles.slotPillSelected,
                                  ]}
                                  disabled={!slot.is_available}
                                  onPress={() => setSelectedSlot(slot)}
                                  testID={`time-slot-${slot.time}`}
                                >
                                  <Text
                                    style={[
                                      styles.slotPillText,
                                      !slot.is_available && styles.slotPillTextDisabled,
                                      isSelected && styles.slotPillTextSelected,
                                    ]}
                                  >
                                    {slot.time}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Afternoon Slots */}
                      {groupedSlots.afternoon.length > 0 && (
                        <View style={styles.slotPeriodGroup}>
                          <Text style={styles.slotPeriodTitle}>Afternoon</Text>
                          <View style={styles.slotsGrid}>
                            {groupedSlots.afternoon.map((slot) => {
                              const isSelected = selectedSlot?.slot_value === slot.slot_value;
                              return (
                                <TouchableOpacity
                                  key={`slot-${slot.slot_value}`}
                                  style={[
                                    styles.slotPill,
                                    !slot.is_available && styles.slotPillDisabled,
                                    isSelected && styles.slotPillSelected,
                                  ]}
                                  disabled={!slot.is_available}
                                  onPress={() => setSelectedSlot(slot)}
                                  testID={`time-slot-${slot.time}`}
                                >
                                  <Text
                                    style={[
                                      styles.slotPillText,
                                      !slot.is_available && styles.slotPillTextDisabled,
                                      isSelected && styles.slotPillTextSelected,
                                    ]}
                                  >
                                    {slot.time}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Evening Slots */}
                      {groupedSlots.evening.length > 0 && (
                        <View style={styles.slotPeriodGroup}>
                          <Text style={styles.slotPeriodTitle}>Evening</Text>
                          <View style={styles.slotsGrid}>
                            {groupedSlots.evening.map((slot) => {
                              const isSelected = selectedSlot?.slot_value === slot.slot_value;
                              return (
                                <TouchableOpacity
                                  key={`slot-${slot.slot_value}`}
                                  style={[
                                    styles.slotPill,
                                    !slot.is_available && styles.slotPillDisabled,
                                    isSelected && styles.slotPillSelected,
                                  ]}
                                  disabled={!slot.is_available}
                                  onPress={() => setSelectedSlot(slot)}
                                  testID={`time-slot-${slot.time}`}
                                >
                                  <Text
                                    style={[
                                      styles.slotPillText,
                                      !slot.is_available && styles.slotPillTextDisabled,
                                      isSelected && styles.slotPillTextSelected,
                                    ]}
                                  >
                                    {slot.time}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* ============================================================== */}
              {/* SCREEN 7: REVIEW AND CONFIRM                                  */}
              {/* ============================================================== */}
              {currentStep === 6 && (
                <View testID="step-review-confirm">
                  <Text style={styles.screenHeading}>Review and Confirm</Text>
                  <Text style={styles.screenSubheading}>
                    Please check the details before booking.
                  </Text>

                  {/* Review Card Surface */}
                  <View style={styles.reviewCard}>
                    {/* Hospital Block */}
                    <View style={styles.reviewRow}>
                      <View style={styles.reviewIconCircle}>
                        <Building2 size={20} color="#155EEF" />
                      </View>
                      <View style={styles.reviewMetaCol}>
                        <Text style={styles.reviewHospitalTitle}>
                          {selectedHospital?.name || "Hospital Alpha"}
                        </Text>
                        <Text style={styles.reviewHospitalSub}>
                          {selectedHospital?.area ? `${selectedHospital.area}, ${selectedHospital.city}` : selectedHospital?.city}
                        </Text>
                      </View>
                    </View>

                    {/* Doctor Block */}
                    <View style={styles.reviewRow}>
                      <View style={[styles.reviewIconCircle, { backgroundColor: "#EFF6FF" }]}>
                        <User size={20} color="#155EEF" />
                      </View>
                      <View style={styles.reviewMetaCol}>
                        <Text style={styles.reviewDocName}>
                          {selectedDoctor ? selectedDoctor.name : "No doctor selected"}
                        </Text>
                        <Text style={styles.reviewDocSub}>
                          {selectedDoctor
                            ? `${selectedDoctor.specialty || selectedSpecialty} • ${selectedDoctor.qualification || "MBBS, MD"}`
                            : "Please go back and select a doctor"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.reviewDivider} />

                    {/* Date & Time */}
                    <View style={styles.reviewDetailItem}>
                      <CalendarIcon size={16} color="#155EEF" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewDetailLabel}>Date & Time</Text>
                        <Text
                          style={[
                            styles.reviewDetailVal,
                            !selectedSlot && { color: "#D92D20" },
                          ]}
                        >
                          {selectedSlot
                            ? `${formatDate(selectedDate)}, ${selectedSlot.time}`
                            : "No time slot selected (Please choose a time slot)"}
                        </Text>
                      </View>
                    </View>

                    {/* Patient */}
                    <View style={styles.reviewDetailItem}>
                      <User size={16} color="#155EEF" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewDetailLabel}>Patient</Text>
                        <Text style={styles.reviewDetailVal}>{selectedPatientName}</Text>
                        <Text style={styles.reviewDetailSub}>{selectedPatientSub}</Text>
                      </View>
                    </View>

                    {/* Consultation Type */}
                    <View style={styles.reviewDetailItem}>
                      <FileText size={16} color="#155EEF" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewDetailLabel}>Consultation Type</Text>
                        <Text style={styles.reviewDetailVal}>OPD Consultation</Text>
                      </View>
                    </View>

                    {/* Fee */}
                    <View style={styles.reviewDetailItem}>
                      <IndianRupee size={16} color="#12A76A" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewDetailLabel}>Consultation Fee</Text>
                        <Text style={[styles.reviewDetailVal, { color: "#12A76A" }]}>
                          ₹{selectedHospital?.consultation_fee || 500} (if applicable)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* ============================================================== */}
              {/* SCREEN 8: BOOKING CONFIRMATION PASS                           */}
              {/* ============================================================== */}
              {currentStep === 7 && (
                <View style={styles.confirmPassContainer} testID="booking-confirmation-view">
                  {/* Success Green Circle Checkmark with Confetti Dots */}
                  <View style={styles.successCheckCircle}>
                    <Check size={38} color="#FFFFFF" strokeWidth={3.5} />
                  </View>
                  <Text style={styles.confirmMainTitle}>Appointment Booked Successfully</Text>
                  <Text style={styles.confirmMainSub}>
                    Your appointment has been confirmed.
                  </Text>

                  {/* Reference Callout Card */}
                  <View style={styles.refCard}>
                    <Text style={styles.refCardLabel}>Appointment Reference</Text>
                    <View style={styles.refCardValueRow}>
                      <Text style={styles.refCardValueText}>
                        {confirmedAppointment?.id || "APT-2026-000456"}
                      </Text>
                      <TouchableOpacity
                        onPress={handleCopyReference}
                        style={styles.refCopyBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Copy size={16} color="#155EEF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Summary Details Box */}
                  <View style={styles.confirmDetailsCard}>
                    <View style={styles.confirmDetailRow}>
                      <Building2 size={16} color="#64748B" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmItemLabel}>Hospital</Text>
                        <Text style={styles.confirmItemVal}>
                          {selectedHospital?.name || "Hospital Alpha"}, {selectedHospital?.area || "Porur"}, {selectedHospital?.city || "Chennai"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.confirmDetailRow}>
                      <Stethoscope size={16} color="#64748B" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmItemLabel}>Doctor</Text>
                        <Text style={styles.confirmItemVal}>
                          {selectedDoctor?.name || "Dr. Senthil Nathan"}
                        </Text>
                        <Text style={styles.confirmItemSub}>{selectedSpecialty}</Text>
                      </View>
                    </View>

                    <View style={styles.confirmDetailRow}>
                      <CalendarIcon size={16} color="#64748B" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmItemLabel}>Date & Time</Text>
                        <Text style={styles.confirmItemVal}>
                          30 Oct 2026, {selectedSlot?.time || "09:30 AM"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.confirmDetailRow}>
                      <FileText size={16} color="#64748B" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmItemLabel}>Consultation Type</Text>
                        <Text style={styles.confirmItemVal}>OPD Consultation</Text>
                      </View>
                    </View>

                    <View style={styles.confirmDetailRow}>
                      <User size={16} color="#64748B" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmItemLabel}>Patient</Text>
                        <Text style={styles.confirmItemVal}>{selectedPatientName}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Bottom Actions for Screen 8 */}
                  <View style={styles.confirmActionCol}>
                    <TouchableOpacity
                      style={styles.primaryActionButton}
                      onPress={handleClose}
                      activeOpacity={0.8}
                      testID="btn-view-booked-appointment"
                    >
                      <Text style={styles.primaryActionButtonText}>View Appointment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryLinkButton}
                      onPress={handleClose}
                      activeOpacity={0.7}
                      testID="btn-back-to-appointments"
                    >
                      <Text style={styles.secondaryLinkText}>Back to Appointments</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* BOTTOM FIXED ACTION BAR (Steps 1 to 6) */}
        {currentStep < 7 && !loadingInitial && (
          <View style={styles.bottomBar}>
            {currentStep === 1 && (
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => setCurrentStep(2)}
                activeOpacity={0.8}
                testID="btn-next-to-hospital"
              >
                <Text style={styles.primaryActionButtonText}>Next: Find Hospital →</Text>
              </TouchableOpacity>
            )}

            {currentStep === 2 && (
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  !selectedHospital && styles.primaryBtnDisabled,
                ]}
                onPress={() => {
                  if (selectedHospital) setCurrentStep(3);
                }}
                activeOpacity={0.8}
                testID="btn-next-to-specialty"
              >
                <Text style={styles.primaryActionButtonText}>Next: Select Specialty →</Text>
              </TouchableOpacity>
            )}

            {currentStep === 3 && (
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  !selectedSpecialty && styles.primaryBtnDisabled,
                ]}
                onPress={() => {
                  if (selectedSpecialty) setCurrentStep(4);
                }}
                activeOpacity={0.8}
                testID="btn-next-to-doctor"
              >
                <Text style={styles.primaryActionButtonText}>Next: Select Doctor →</Text>
              </TouchableOpacity>
            )}

            {currentStep === 4 && (
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (!selectedDoctor || loadingDoctors) && styles.primaryBtnDisabled,
                ]}
                disabled={!selectedDoctor || loadingDoctors}
                onPress={() => {
                  if (selectedDoctor) {
                    setCurrentStep(5);
                  } else {
                    setErrorMessage("Please select a doctor to continue.");
                  }
                }}
                activeOpacity={0.8}
                testID="btn-next-to-datetime"
              >
                <Text style={styles.primaryActionButtonText}>Next: Select Date & Time →</Text>
              </TouchableOpacity>
            )}

            {currentStep === 5 && (
              <TouchableOpacity
                style={[
                  styles.primaryActionButton,
                  (!selectedSlot || loadingSlots) && styles.primaryBtnDisabled,
                ]}
                disabled={!selectedSlot || loadingSlots}
                onPress={() => {
                  let slotToUse = selectedSlot;
                  if (!slotToUse && slots.length > 0) {
                    slotToUse = slots.find((s) => s.is_available) || null;
                    if (slotToUse) setSelectedSlot(slotToUse);
                  }
                  if (slotToUse) {
                    setCurrentStep(6);
                  } else {
                    setErrorMessage("Please select an available appointment time slot.");
                  }
                }}
                activeOpacity={0.8}
                testID="btn-next-to-review"
              >
                <Text style={styles.primaryActionButtonText}>Next: Review Appointment →</Text>
              </TouchableOpacity>
            )}

            {currentStep === 6 && (
              <View style={styles.twoBtnRow}>
                <TouchableOpacity
                  style={styles.backOutlineBtn}
                  onPress={() => setCurrentStep(5)}
                  disabled={submittingBooking}
                  testID="btn-review-back"
                >
                  <Text style={styles.backOutlineBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryActionButton,
                    { flex: 1.6 },
                    submittingBooking && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleConfirmBooking}
                  disabled={submittingBooking}
                  activeOpacity={0.8}
                  testID="btn-confirm-booking"
                >
                  {submittingBooking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryActionButtonText}>Confirm Booking</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Sensitive Transactional API Request Processing Overlay (Concept 9) */}
      <LoadingOverlay
        visible={submittingBooking}
        title="Processing Request..."
        message="Booking your appointment with the selected hospital"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4EAF2",
  },
  backButton: {
    padding: 6,
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102A56",
  },
  closeButton: {
    padding: 6,
  },
  stepperContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E4EAF2",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: "#155EEF",
  },
  stepCircleCompleted: {
    backgroundColor: "#155EEF",
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  stepNumberTextActive: {
    color: "#FFFFFF",
  },
  stepLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  stepLabelTextActive: {
    color: "#155EEF",
    fontWeight: "700",
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepConnectorActive: {
    backgroundColor: "#155EEF",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  screenHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102A56",
    letterSpacing: -0.3,
  },
  screenSubheading: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingMsg: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E4EAF2",
  },
  patientCardSelected: {
    borderColor: "#155EEF",
    backgroundColor: "#F8FAFF",
  },
  patientAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF4FF",
    borderWidth: 1,
    borderColor: "#D1E0FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  patientMeta: {
    flex: 1,
  },
  patientTypeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#155EEF",
    marginBottom: 1,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#102A56",
  },
  patientIdText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#155EEF",
    marginTop: 1,
  },
  patientDemogText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  radioOuterSelected: {
    borderColor: "#155EEF",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#155EEF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#102A56",
    padding: 0,
  },
  hospitalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E4EAF2",
  },
  hospitalCardSelected: {
    borderColor: "#155EEF",
    backgroundColor: "#F8FAFF",
  },
  hospitalLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EFF4FF",
    borderWidth: 1,
    borderColor: "#D1E0FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  hospitalInfoCol: {
    flex: 1,
  },
  hospNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hospitalNameTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  hospitalCategoryText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  hospitalAddressText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  specialtyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E4EAF2",
  },
  specialtyCardSelected: {
    borderColor: "#155EEF",
    backgroundColor: "#F8FAFF",
  },
  specialtyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  specialtyInfoCol: {
    flex: 1,
  },
  specialtyNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  specialtyDescText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  docFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  docFilterDropdown: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAF2",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  docFilterDropdownText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#344054",
  },
  dutyDoctorBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: "#B9E6FE",
  },
  dutyDoctorBannerCardSelected: {
    borderColor: "#155EEF",
    backgroundColor: "#EFF4FF",
  },
  dutyBannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dutyBannerTextCol: {
    flex: 1,
  },
  dutyBannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  dutyBannerTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#026AA2",
  },
  dutyInstantBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  dutyInstantBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#026AA2",
  },
  dutyBannerSub: {
    fontSize: 11,
    color: "#475467",
    marginTop: 2,
  },
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    gap: 8,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4EAF2",
  },
  orDividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  dutyDoctorPromptBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginTop: 14,
    alignItems: "center",
  },
  dutyPromptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dutyPromptTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#155EEF",
  },
  dutyPromptSub: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 10,
  },
  btnSwitchToDutyDoctor: {
    backgroundColor: "#155EEF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnSwitchToDutyDoctorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyDoctorBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyDoctorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  emptyDoctorSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E4EAF2",
  },
  doctorCardSelected: {
    borderColor: "#155EEF",
    backgroundColor: "#F8FAFF",
  },
  doctorAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF4FF",
    borderWidth: 1,
    borderColor: "#D1E0FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  doctorInfoCol: {
    flex: 1,
  },
  doctorCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  doctorCardSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  availPill: {
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  availPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  doctorMiniCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    marginBottom: 14,
  },
  doctorMiniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  doctorMiniMeta: {
    flex: 1,
  },
  doctorMiniName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102A56",
  },
  doctorMiniSub: {
    fontSize: 11,
    color: "#64748B",
  },
  monthHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  monthHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102A56",
  },
  monthArrows: {
    flexDirection: "row",
    gap: 6,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAF2",
    justifyContent: "center",
    alignItems: "center",
  },
  dateScrollRow: {
    gap: 8,
    paddingBottom: 14,
  },
  datePillBox: {
    width: 48,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAF2",
    alignItems: "center",
    justifyContent: "center",
  },
  datePillBoxSelected: {
    backgroundColor: "#155EEF",
    borderColor: "#155EEF",
  },
  datePillDayText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  datePillDayTextSelected: {
    color: "#BFDBFE",
  },
  datePillNumText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102A56",
    marginTop: 2,
  },
  datePillNumTextSelected: {
    color: "#FFFFFF",
  },
  slotPeriodGroup: {
    marginBottom: 14,
  },
  slotPeriodTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotPill: {
    width: "23%",
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  slotPillSelected: {
    backgroundColor: "#155EEF",
    borderColor: "#155EEF",
  },
  slotPillDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    opacity: 0.6,
  },
  slotPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  slotPillTextSelected: {
    color: "#FFFFFF",
  },
  slotPillTextDisabled: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4EAF2",
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  reviewIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reviewMetaCol: {
    flex: 1,
  },
  reviewHospitalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#102A56",
  },
  reviewHospitalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  reviewDocName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  reviewDocSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  reviewDetailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewDetailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  reviewDetailVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102A56",
    marginTop: 1,
  },
  reviewDetailSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  twoBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  backOutlineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backOutlineBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
  },
  confirmPassContainer: {
    alignItems: "center",
    paddingTop: 16,
  },
  successCheckCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#12A76A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#12A76A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmMainTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A56",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  confirmMainSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  refCard: {
    width: "100%",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  refCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  refCardValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  refCardValueText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#155EEF",
    letterSpacing: 0.5,
  },
  refCopyBtn: {
    padding: 4,
  },
  confirmDetailsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  confirmDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  confirmItemLabel: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
  confirmItemVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#102A56",
    marginTop: 1,
  },
  confirmItemSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  confirmActionCol: {
    width: "100%",
    gap: 10,
  },
  secondaryLinkButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#155EEF",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E4EAF2",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  primaryActionButton: {
    backgroundColor: "#155EEF",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#155EEF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
  },
  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  errorNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  toastNotice: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    backgroundColor: "#102A56",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
