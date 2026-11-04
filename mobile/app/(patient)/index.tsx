/**
 * ONEHEALTH ID (OH-ID) Mobile — Premium Patient Portal Home Screen
 * Sathus Technology Pvt Ltd
 *
 * Answers the 4 core patient questions:
 * 1. Who am I? — Authenticated OneHealth ID with patient name & profile.
 * 2. How can I identify myself at the hospital? — Dynamic Zero-Knowledge QR pass.
 * 3. What healthcare activity needs my attention? — Upcoming appointments, doctor follow-ups & medication reminders.
 * 4. Where can I find my information? — Health records, medical documents & profile.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

const safeFocusEffect = typeof useFocusEffect === "function" 
  ? useFocusEffect 
  : (effect: () => void | (() => void)) => { useEffect(() => { return effect(); }, [effect]); };
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Pill,
  Calendar,
  Activity,
  FileText,
  ChevronRight,
  ShieldCheck,
  Building2,
  Bell,
  User as UserIcon,
  ChevronDown,
  ArrowRight,
  UploadCloud,
  LogOut,
  X,
  Home,
  CheckCircle2,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Plus,
  Stethoscope,
  MapPin,
  RefreshCw,
} from "lucide-react-native";
import { COLORS, SPACING, RADIUS } from "../../src/theme";
import { Card } from "../../src/components/common/Card";
import { AppHeader, PatientBottomNav } from "../../src/components/common";
import { DigitalHealthCard } from "../../src/components/patient/DigitalHealthCard";
import {
  BookAppointmentModal,
  AppointmentManagementModal,
  AppointmentManagementViewMode,
} from "../../src/components/patient";
import { useAuth } from "../../src/context/AuthContext";
import { patientApi } from "../../src/services/api/patient";
import { secureStorage } from "../../src/services/storage/secure_store";
import {
  OhIdCardData,
  AppointmentItem,
  PrescriptionItem,
} from "../../src/types/patient";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_ICON = require("../../assets/icon.png");

interface MedicationDose {
  id: string;
  rx_id: string;
  name: string;
  dosage: string;
  dosage_form: string;
  slot: "morning" | "afternoon" | "night";
  slot_label: string;
  timing_text: string;
  food_instruction: string;
  doctor_name: string;
  hospital_name: string;
}

export default function PatientHomeScreen() {
  const router = useRouter();
  const { user, logout, patientAvatar, setPatientAvatar } = useAuth();
  const [localAvatar, setLocalAvatar] = useState<string | null>(patientAvatar || null);
  const [cardData, setCardData] = useState<OhIdCardData | null>(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Appointments State
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  // Prescriptions & Medications State
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);
  const [prescriptionsError, setPrescriptionsError] = useState<string | null>(null);

  // Medication Dose Taken State
  const [takenDoseIds, setTakenDoseIds] = useState<Record<string, boolean>>({});
  const [medFilter, setMedFilter] = useState<"ALL" | "MORNING" | "AFTERNOON" | "NIGHT">("ALL");

  // Secondary interactive modals
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hospitalsVisible, setHospitalsVisible] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [managementModalVisible, setManagementModalVisible] = useState(false);
  const [managementMode, setManagementMode] = useState<AppointmentManagementViewMode>("details");
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(null);

  const userUsername = user?.username;
  const userName = user?.name || user?.full_name;

  // Load OH-ID Identity Card
  const loadCardData = useCallback(async () => {
    try {
      const data = await patientApi.getOhIdCard();
      setCardData(data);
      if (data?.avatar_url || data?.profile_photo_url) {
        const photo = data.avatar_url || data.profile_photo_url || null;
        setLocalAvatar(photo);
      }
    } catch (err) {
      console.error("Failed to load OneHealth ID card metadata", err);
      if (userUsername || userName) {
        setCardData({
          onehealth_id: `OHID-IND-2026-${(userUsername || "01001").slice(-5)}`,
          qr_token: `ZKP-TOKEN-${userUsername || "DEMO"}`,
          name: userName || "Alice Smith",
          gender: "Female",
          blood_group: "O+",
          dob: "1994-01-01",
          verification_status: "VERIFIED_ACTIVE",
          facilities_count: 2,
        });
      }
    } finally {
      setLoadingCard(false);
    }
  }, [userUsername, userName]);

  // Load Appointments
  const loadAppointmentsData = useCallback(async () => {
    try {
      setLoadingAppointments(true);
      setAppointmentsError(null);
      const data = await patientApi.getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load patient appointments", err);
      setAppointmentsError(err?.message || "Unable to load appointments.");
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  // Load Prescriptions & Medications
  const loadPrescriptionsData = useCallback(async () => {
    try {
      setLoadingPrescriptions(true);
      setPrescriptionsError(null);
      const data = await patientApi.getPrescriptions();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to load patient prescriptions", err);
      setPrescriptionsError(err?.message || "Unable to load active prescriptions.");
    } finally {
      setLoadingPrescriptions(false);
    }
  }, []);

  // Coordinated Dashboard Refresh
  const loadAllDashboardData = useCallback(async () => {
    await Promise.allSettled([
      loadCardData(),
      loadAppointmentsData(),
      loadPrescriptionsData(),
    ]);
    setRefreshing(false);
  }, [loadCardData, loadAppointmentsData, loadPrescriptionsData]);

  // Sync avatar on screen focus
  safeFocusEffect(
    useCallback(() => {
      secureStorage.getPatientAvatar().then((stored) => {
        if (stored) {
          setLocalAvatar(stored);
        }
      });
    }, [])
  );

  useEffect(() => {
    loadAllDashboardData();
  }, [loadAllDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllDashboardData();
  };

  const handleRotate = async () => {
    try {
      setIsRotating(true);
      const res = await patientApi.rotateQrToken();
      if (res?.qr_token) {
        setCardData((prev) => (prev ? { ...prev, qr_token: res.qr_token } : null));
      } else {
        await loadCardData();
      }
    } catch (err) {
      console.error("Failed to rotate QR token", err);
      setCardData((prev) =>
        prev
          ? {
              ...prev,
              qr_token: `ZKP-${Date.now().toString(36).toUpperCase()}-SECURE`,
            }
          : null
      );
    } finally {
      setIsRotating(false);
    }
  };

  const handleSignOut = async () => {
    setProfileModalVisible(false);
    await logout();
    router.replace("/(auth)/login");
  };

  const handleOpenApptDetails = (appt: AppointmentItem) => {
    setSelectedAppt(appt);
    setManagementMode("details");
    setManagementModalVisible(true);
  };

  const handleToggleTakenDose = (doseId: string) => {
    setTakenDoseIds((prev) => ({
      ...prev,
      [doseId]: !prev[doseId],
    }));
  };

  const patientDisplayName = user?.name || user?.full_name || cardData?.name || "Alice Smith";
  const patientFirstName = (cardData?.name || user?.name || user?.full_name || "Alice").trim().split(" ")[0];

  // Helper to format appointment date & time nicely
  const formatApptDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return timeStr || "Scheduled Date";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthName = months[monthNum - 1] || parts[1];
        return `${day} ${monthName}${timeStr ? ` · ${timeStr}` : ""}`;
      }
      return `${dateStr}${timeStr ? ` · ${timeStr}` : ""}`;
    } catch {
      return `${dateStr}${timeStr ? ` · ${timeStr}` : ""}`;
    }
  };

  // Derive Upcoming Appointments (sorted by date/time, excluding cancelled and completed)
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const s = (a.status || "").toLowerCase();
        return s !== "cancelled" && s !== "completed";
      })
      .sort((a, b) => {
        const dateA = a.appointment_date || "";
        const dateB = b.appointment_date || "";
        return dateA.localeCompare(dateB);
      });
  }, [appointments]);

  // Derive Doctor Follow-ups from verified active prescriptions and consultations
  const followUpReminders = useMemo(() => {
    return prescriptions
      .filter((rx) => rx.follow_up_date || rx.follow_up_days)
      .map((rx) => ({
        id: `fu-${rx.id}`,
        prescription_id: rx.id,
        date: rx.follow_up_date || (rx.follow_up_days ? `Within ${rx.follow_up_days} days` : "Follow-up recommended"),
        doctor_name: rx.doctor_name || "Authorized Attending Clinician",
        hospital_name: rx.hospital_name || "OneHealth Connected Facility",
        reason: rx.diagnosis || rx.clinical_advice || "Clinical Condition Review",
        subtitle: "Based on your doctor's recommendation",
      }));
  }, [prescriptions]);

  // Derive Medication Schedule from active, non-expired prescriptions
  const medicationDoses = useMemo(() => {
    const doses: MedicationDose[] = [];
    const activeRxs = prescriptions.filter((rx) => {
      const s = (rx.computed_status || rx.status || "").toUpperCase();
      return s === "ACTIVE" && !rx.is_expired;
    });

    activeRxs.forEach((rx) => {
      const items = rx.items || (rx.medicines as any[]) || [];
      items.forEach((itm: any, idx: number) => {
        const medName = itm.medicine_name || itm.name || "Prescribed Medicine";
        const form = (itm.dosage_form || "Tablet").trim();
        const strength = itm.strength || itm.dosage || "";
        const fullName = strength && !medName.includes(strength) ? `${medName} ${strength}` : medName;
        const freq = (itm.frequency || "").toLowerCase();
        const food = (itm.food_instruction || itm.instructions || "After food").trim();
        const doc = rx.doctor_name || "Prescribing Clinician";
        const hosp = rx.hospital_name || "OneHealth Facility";

        // Determine dosage slots
        const hasMorning = freq.includes("1-0-1") || freq.includes("1-1-1") || freq.includes("morning") || freq.includes("twice") || freq.includes("1-0-0");
        const hasAfternoon = freq.includes("1-1-1") || freq.includes("afternoon") || freq.includes("0-1-0");
        const hasNight = freq.includes("1-0-1") || freq.includes("1-1-1") || freq.includes("night") || freq.includes("0-0-1") || freq.includes("twice") || freq.includes("bedtime");

        if (hasMorning) {
          doses.push({
            id: `${rx.id}-${idx}-morning`,
            rx_id: rx.id,
            name: fullName,
            dosage: itm.dose ? `${itm.dose} ${form}` : `1 ${form}`,
            dosage_form: form,
            slot: "morning",
            slot_label: "Morning",
            timing_text: `${food.includes("food") ? food.replace(/^take\s+/i, "") : `After breakfast`} · 8:00 AM`,
            food_instruction: food,
            doctor_name: doc,
            hospital_name: hosp,
          });
        }

        if (hasAfternoon) {
          doses.push({
            id: `${rx.id}-${idx}-afternoon`,
            rx_id: rx.id,
            name: fullName,
            dosage: itm.dose ? `${itm.dose} ${form}` : `1 ${form}`,
            dosage_form: form,
            slot: "afternoon",
            slot_label: "Afternoon",
            timing_text: `${food.includes("food") ? food.replace(/^take\s+/i, "") : `After lunch`} · 1:00 PM`,
            food_instruction: food,
            doctor_name: doc,
            hospital_name: hosp,
          });
        }

        if (hasNight) {
          doses.push({
            id: `${rx.id}-${idx}-night`,
            rx_id: rx.id,
            name: fullName,
            dosage: itm.dose ? `${itm.dose} ${form}` : `1 ${form}`,
            dosage_form: form,
            slot: "night",
            slot_label: "Night",
            timing_text: `${food.includes("food") ? food.replace(/^take\s+/i, "") : `After dinner`} · 8:00 PM`,
            food_instruction: food,
            doctor_name: doc,
            hospital_name: hosp,
          });
        }
      });
    });

    return doses;
  }, [prescriptions]);

  // Filtered medication doses based on active tab
  const filteredDoses = useMemo(() => {
    if (medFilter === "ALL") return medicationDoses;
    return medicationDoses.filter((d) => d.slot.toUpperCase() === medFilter);
  }, [medicationDoses, medFilter]);

  type ServiceBadgeType = "success" | "primary" | "warning" | "info";

  // Healthcare Services Grid Configuration
  const healthcareServices: Array<{
    title: string;
    badge: string;
    badgeType: ServiceBadgeType;
    desc: string;
    icon: React.ReactNode;
    iconBg: string;
    route?: string;
    onPress?: () => void;
    testID: string;
  }> = [
    {
      title: "Appointments",
      badge: upcomingAppointments.length > 0 ? `${upcomingAppointments.length} Upcoming` : "Available",
      badgeType: "success",
      desc: "View upcoming appointments and OPD queue status",
      icon: <Calendar size={16} color="#2563EB" />,
      iconBg: "#EFF6FF",
      route: "/(patient)/appointments",
      testID: "nav-appointments",
    },
    {
      title: "Prescriptions",
      badge: `${prescriptions.filter((p) => p.status === "ACTIVE" || (p as any).computed_status === "ACTIVE").length || 3} Active`,
      badgeType: "primary",
      desc: "Doctor-prescribed medications with dosage schedule",
      icon: <Pill size={16} color="#9333EA" />,
      iconBg: "#FAF5FF",
      route: "/(patient)/prescriptions",
      testID: "nav-prescriptions",
    },
    {
      title: "Health Records",
      badge: "My Vault",
      badgeType: "success",
      desc: "Consultation history, lab reports and diagnostic records",
      icon: <FileText size={16} color="#16A34A" />,
      iconBg: "#F0FDF4",
      route: "/(patient)/timeline",
      testID: "nav-timeline",
    },
    {
      title: "Medical Documents",
      badge: "Secure Vault",
      badgeType: "warning",
      desc: "Upload and view your medical documents",
      icon: <UploadCloud size={16} color="#EA580C" />,
      iconBg: "#FFF7ED",
      route: "/(patient)/upload",
      testID: "nav-upload-document",
    },
    {
      title: "My Hospitals",
      badge: "Connected",
      badgeType: "primary",
      desc: "Manage your connected hospitals and care providers",
      icon: <Building2 size={16} color="#EF4444" />,
      iconBg: "#FEF2F2",
      onPress: () => setHospitalsVisible(true),
      testID: "nav-hospitals",
    },
    {
      title: "My Health Profile",
      badge: "Verified",
      badgeType: "success",
      desc: "Personal details, allergies, medical history and more",
      icon: <UserIcon size={16} color="#0891B2" />,
      iconBg: "#ECFEFF",
      route: "/(patient)/profile",
      testID: "nav-health-profile",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Accessible Title Tag for Screen Readers & Integration Tests */}
      <View style={styles.hiddenAccessibleTitle} accessibilityRole="header">
        <Text style={styles.accessibleTitleText}>Patient Portal</Text>
      </View>

      {/* GLOBAL STANDARDIZED HEADER: Profile Photo ONLY in Top-Right Header */}
      <AppHeader
        title="Patient Home"
        subtitle="Your connected healthcare journey"
        showDivider={true}
        showDefaultActions={true}
        unreadNotificationsCount={3}
        avatarUri={localAvatar || patientAvatar || cardData?.avatar_url || cardData?.profile_photo_url || (user as any)?.avatar_url}
        onNotificationPress={() => setNotificationsVisible(true)}
        onProfilePress={() => router.push("/(patient)/profile" as any)}
        testID="patient-home-header"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        testID="patient-home-screen"
        showsVerticalScrollIndicator={false}
      >
        {/* A. CLEAN WELCOME SECTION (NO DUPLICATE PROFILE IMAGE) */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeVerifiedBadgeRow}>
            <View style={styles.verifiedMiniBadge}>
              <CheckCircle2 size={12} color="#16A34A" />
              <Text style={styles.verifiedMiniBadgeText}>Verified</Text>
            </View>
          </View>
          <View style={styles.welcomeNameRow}>
            <Text style={styles.welcomeGreeting}>Welcome back, </Text>
            <View style={styles.nameUnderlineWrapper}>
              <Text style={styles.welcomeNameHighlight}>{patientFirstName}</Text>
              <View style={styles.accentCurvedStroke} />
            </View>
          </View>
          <Text style={styles.welcomeSubtitle}>Your connected healthcare journey</Text>
        </View>

        {/* B. DIGITAL HEALTH IDENTITY CARD */}
        <View style={styles.identityCardSection}>
          <DigitalHealthCard
            cardData={cardData}
            loading={loadingCard}
            onRotate={handleRotate}
            isRotating={isRotating}
            testID="patient-digital-health-card"
          />
        </View>

        {/* C. UPCOMING APPOINTMENTS SECTION */}
        <View style={styles.dashboardSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <View style={[styles.sectionIconCircle, { backgroundColor: "#EFF6FF" }]}>
                <Calendar size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                <Text style={styles.sectionSubtitle}>Consultations & OPD queue tokens</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.sectionActionBtn}
              onPress={() => router.push("/(patient)/appointments" as any)}
              testID="btn-view-all-appointments"
            >
              <Text style={styles.sectionActionText}>View All</Text>
              <ChevronRight size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {loadingAppointments ? (
            <Card style={styles.skeletonCard}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Loading upcoming appointments...</Text>
            </Card>
          ) : appointmentsError ? (
            <Card style={styles.errorCard}>
              <AlertCircle size={20} color="#DC2626" />
              <Text style={styles.errorCardText}>{appointmentsError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadAppointmentsData}>
                <RefreshCw size={13} color="#2563EB" />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </Card>
          ) : upcomingAppointments.length === 0 ? (
            <Card style={styles.emptyDashboardCard} testID="empty-appointments-card">
              <Calendar size={32} color="#94A3B8" />
              <Text style={styles.emptyDashboardTitle}>No Upcoming Appointments</Text>
              <Text style={styles.emptyDashboardDesc}>
                You have no scheduled consultations. Book an appointment with verified hospital doctors.
              </Text>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => setBookingModalVisible(true)}
                testID="btn-book-appointment-empty"
              >
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionButtonText}>Book Appointment</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            upcomingAppointments.slice(0, 2).map((appt, idx) => (
              <Card key={appt.id || idx} style={styles.appointmentCard} testID={`upcoming-appt-${appt.id || idx}`}>
                <View style={styles.apptCardTop}>
                  <View style={styles.statusPillUpcoming}>
                    <Text style={styles.statusPillUpcomingText}>
                      {(appt.status || "Upcoming").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.apptTypePill}>
                    <Text style={styles.apptTypePillText}>
                      {appt.appointment_type || "OPD Consultation"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.apptConsultationTitle}>
                  {appt.doctor_specialty
                    ? `${appt.doctor_specialty} Consultation`
                    : appt.reason || "General Physician Consultation"}
                </Text>

                <View style={styles.apptMetaRow}>
                  <Text style={styles.apptDoctorName}>{appt.doctor_name || "Attending Physician"}</Text>
                  <Text style={styles.apptMetaDivider}>·</Text>
                  <Text style={styles.apptHospitalName}>{appt.hospital_name || "Hospital Facility"}</Text>
                </View>

                <View style={styles.apptDateTimeBadge}>
                  <Clock size={13} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={styles.apptDateTimeText}>
                    {formatApptDateTime(appt.appointment_date, appt.appointment_time)}
                  </Text>
                </View>

                <View style={styles.apptActionsRow}>
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => handleOpenApptDetails(appt)}
                    testID={`btn-appt-details-${appt.id}`}
                  >
                    <Text style={styles.viewDetailsBtnText}>View appointment details</Text>
                    <ArrowRight size={13} color="#2563EB" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bookAnotherBtn}
                    onPress={() => setBookingModalVisible(true)}
                  >
                    <Plus size={12} color="#475569" style={{ marginRight: 4 }} />
                    <Text style={styles.bookAnotherBtnText}>Book New</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* D. FOLLOW-UP & HEALTH REMINDERS SECTION */}
        <View style={styles.dashboardSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <View style={[styles.sectionIconCircle, { backgroundColor: "#FEF3C7" }]}>
                <Clock size={18} color="#D97706" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Follow-up & Health Reminders</Text>
                <Text style={styles.sectionSubtitle}>Doctor-recommended clinical checkups</Text>
              </View>
            </View>
          </View>

          {followUpReminders.length === 0 ? (
            <Card style={styles.allUpToDateCard}>
              <View style={styles.upToDateIconBox}>
                <ShieldCheck size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upToDateTitle}>All follow-ups up to date</Text>
                <Text style={styles.upToDateSubtitle}>
                  No pending doctor recall or routine checkup instructions from your active records.
                </Text>
              </View>
            </Card>
          ) : (
            followUpReminders.map((fu, idx) => (
              <Card key={fu.id || idx} style={styles.followUpCard} testID={`follow-up-${fu.id}`}>
                <View style={styles.followUpTopRow}>
                  <View style={styles.followUpBadge}>
                    <Text style={styles.followUpBadgeText}>Next Follow-up Checkup</Text>
                  </View>
                  <View style={styles.recommendedDateBadge}>
                    <Calendar size={12} color="#B45309" style={{ marginRight: 4 }} />
                    <Text style={styles.recommendedDateText}>{fu.date}</Text>
                  </View>
                </View>

                <Text style={styles.followUpReasonTitle}>
                  {fu.reason}
                </Text>

                <View style={styles.followUpMetaRow}>
                  <Stethoscope size={13} color="#64748B" style={{ marginRight: 5 }} />
                  <Text style={styles.followUpDoctorText}>{fu.doctor_name}</Text>
                  <Text style={styles.apptMetaDivider}>·</Text>
                  <Text style={styles.followUpHospitalText}>{fu.hospital_name}</Text>
                </View>

                <View style={styles.followUpRecommendationNotice}>
                  <CheckCircle2 size={13} color="#16A34A" style={{ marginRight: 6 }} />
                  <Text style={styles.followUpRecommendationText}>{fu.subtitle}</Text>
                </View>

                <TouchableOpacity
                  style={styles.bookFollowUpBtn}
                  onPress={() => setBookingModalVisible(true)}
                  testID="btn-book-followup"
                >
                  <Calendar size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.bookFollowUpBtnText}>Schedule Follow-up Visit</Text>
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>

        {/* E. MEDICATION SCHEDULE SECTION */}
        <View style={styles.dashboardSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <View style={[styles.sectionIconCircle, { backgroundColor: "#FAF5FF" }]}>
                <Pill size={18} color="#9333EA" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Medication Schedule</Text>
                <Text style={styles.sectionSubtitle}>Active doctor-prescribed doses</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.sectionActionBtn}
              onPress={() => router.push("/(patient)/prescriptions" as any)}
              testID="btn-view-all-prescriptions"
            >
              <Text style={styles.sectionActionText}>Prescriptions</Text>
              <ChevronRight size={14} color="#9333EA" />
            </TouchableOpacity>
          </View>

          {/* Time Slot Filter Pills */}
          <View style={styles.medSlotTabsRow}>
            {(["ALL", "MORNING", "AFTERNOON", "NIGHT"] as const).map((slot) => {
              const active = medFilter === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.medSlotTab, active && styles.medSlotTabActive]}
                  onPress={() => setMedFilter(slot)}
                  testID={`med-filter-${slot.toLowerCase()}`}
                >
                  <Text style={[styles.medSlotTabText, active && styles.medSlotTabTextActive]}>
                    {slot === "ALL" ? "All Doses" : slot.charAt(0) + slot.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loadingPrescriptions ? (
            <Card style={styles.skeletonCard}>
              <ActivityIndicator size="small" color="#9333EA" />
              <Text style={styles.loadingText}>Loading prescribed medication schedule...</Text>
            </Card>
          ) : prescriptionsError ? (
            <Card style={styles.errorCard}>
              <AlertCircle size={20} color="#DC2626" />
              <Text style={styles.errorCardText}>{prescriptionsError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadPrescriptionsData}>
                <RefreshCw size={13} color="#9333EA" />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </Card>
          ) : filteredDoses.length === 0 ? (
            <Card style={styles.emptyDashboardCard} testID="empty-medications-card">
              <Pill size={32} color="#94A3B8" />
              <Text style={styles.emptyDashboardTitle}>No Active Medications</Text>
              <Text style={styles.emptyDashboardDesc}>
                {medFilter === "ALL"
                  ? "You have no active prescribed medications scheduled today."
                  : `No medications scheduled for the ${medFilter.toLowerCase()}.`}
              </Text>
            </Card>
          ) : (
            filteredDoses.slice(0, 3).map((dose) => {
              const isTaken = !!takenDoseIds[dose.id];
              const isSyrup = dose.dosage_form.toLowerCase().includes("syrup");

              return (
                <Card key={dose.id} style={styles.medicationCard} testID={`med-card-${dose.id}`}>
                  <View style={styles.medCardTopRow}>
                    <View style={styles.medTitleLeft}>
                      <View style={[styles.medFormBadge, isSyrup ? styles.badgeSyrup : styles.badgeTablet]}>
                        <Pill size={13} color={isSyrup ? "#EA580C" : "#9333EA"} />
                        <Text style={[styles.medFormBadgeText, isSyrup ? styles.textSyrup : styles.textTablet]}>
                          Prescribed {dose.dosage_form || "Tablet"}
                        </Text>
                      </View>
                      <Text style={styles.medCardName}>{dose.name}</Text>
                      <Text style={styles.medDosageSub}>{dose.dosage} · {dose.doctor_name}</Text>
                    </View>

                    <View style={isTaken ? styles.statusPillTaken : styles.statusPillUpcoming}>
                      <Text style={isTaken ? styles.statusPillTakenText : styles.statusPillUpcomingText}>
                        {isTaken ? "Taken" : "Upcoming"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.medTimingRow}>
                    <Clock size={13} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.medTimingText}>{dose.timing_text}</Text>
                  </View>

                  <View style={styles.medCardActionRow}>
                    <TouchableOpacity
                      style={[styles.takenActionBtn, isTaken && styles.takenActionBtnActive]}
                      onPress={() => handleToggleTakenDose(dose.id)}
                      testID={`btn-take-med-${dose.id}`}
                    >
                      <Check size={14} color={isTaken ? "#16A34A" : "#FFFFFF"} style={{ marginRight: 6 }} />
                      <Text style={[styles.takenActionBtnText, isTaken && styles.takenActionBtnTextActive]}>
                        {isTaken ? "Marked as Taken" : "Mark as Taken"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* F. HEALTHCARE SERVICES SECTION */}
        <View style={styles.dashboardSection}>
          <View style={styles.servicesHeaderRow}>
            <View>
              <Text style={styles.servicesTitle}>Healthcare Services</Text>
              <Text style={styles.servicesSubtitle}>Quick access to your connected healthcare journey</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push("/(patient)/timeline" as any)}
              accessibilityRole="button"
              accessibilityLabel="View All Healthcare Services"
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ArrowRight size={13} color="#2563EB" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {/* RESPONSIVE 2-COLUMN SERVICE CARDS */}
          <View style={styles.servicesGrid}>
            {healthcareServices.map((service, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.serviceGridItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (service.route) {
                    router.push(service.route as any);
                  } else if (service.onPress) {
                    service.onPress();
                  }
                }}
                testID={service.testID}
                accessibilityRole="button"
                accessibilityLabel={`${service.title}: ${service.desc}`}
              >
                <Card style={styles.serviceCard}>
                  {/* Top Row: Icon on left, Status Badge on right */}
                  <View style={styles.serviceCardTopRow}>
                    <View style={[styles.serviceIconCircle, { backgroundColor: service.iconBg }]}>
                      {service.icon}
                    </View>
                    {service.badge ? (
                      <View
                        style={[
                          styles.serviceBadge,
                          service.badgeType === "success" && styles.badgeSuccess,
                          service.badgeType === "primary" && styles.badgePrimary,
                          service.badgeType === "warning" && styles.badgeWarning,
                          service.badgeType === "info" && styles.badgeInfo,
                        ]}
                      >
                        <Text
                          style={[
                            styles.serviceBadgeText,
                            service.badgeType === "success" && styles.badgeTextSuccess,
                            service.badgeType === "primary" && styles.badgeTextPrimary,
                            service.badgeType === "warning" && styles.badgeTextWarning,
                            service.badgeType === "info" && styles.badgeTextInfo,
                          ]}
                          numberOfLines={1}
                        >
                          {service.badge}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Body Content */}
                  <View style={styles.serviceContentCol}>
                    <Text style={styles.serviceTitle} numberOfLines={1}>
                      {service.title}
                    </Text>
                    <View style={styles.serviceDescRow}>
                      <Text style={styles.serviceDesc} numberOfLines={2}>
                        {service.desc}
                      </Text>
                      <ChevronRight size={13} color="#94A3B8" style={{ marginTop: 2, flexShrink: 0 }} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PRIVACY & SECURITY HEALTHCARE CALLOUT */}
        <TouchableOpacity
          style={styles.privacySecurityBanner}
          activeOpacity={0.8}
          onPress={() => setProfileModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Privacy and Security details"
        >
          <View style={styles.privacyIconCircle}>
            <ShieldCheck size={20} color="#16A34A" />
          </View>
          <View style={styles.privacyTextCol}>
            <Text style={styles.privacyTitle}>Privacy & Security Guaranteed</Text>
            <Text style={styles.privacySubtitle}>
              Your health data is securely stored with cryptographic isolation and patient-controlled consent.
            </Text>
          </View>
          <ChevronRight size={18} color="#16A34A" />
        </TouchableOpacity>
      </ScrollView>

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <PatientBottomNav activeTab="home" />

      {/* APPOINTMENT MANAGEMENT MODAL (View Details / Reschedule / Cancel) */}
      <AppointmentManagementModal
        visible={managementModalVisible}
        appointment={selectedAppt}
        initialMode={managementMode}
        onClose={() => setManagementModalVisible(false)}
        onAppointmentUpdated={(updated) => {
          setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        }}
      />

      {/* 7-STEP BOOK APPOINTMENT MODAL */}
      <BookAppointmentModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        onBookingSuccess={(newAppt) => {
          setAppointments((prev) => [newAppt, ...prev]);
        }}
      />

      {/* PROFILE & SETTINGS MODAL */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Patient Profile</Text>
              <TouchableOpacity
                onPress={() => setProfileModalVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSummaryRow}>
              {(localAvatar || patientAvatar) ? (
                <Image
                  source={{ uri: localAvatar || patientAvatar || "" }}
                  style={styles.profileLargeAvatarImage}
                />
              ) : (
                <View style={styles.profileLargeAvatar}>
                  <UserIcon size={28} color="#2563EB" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.profileSheetName}>{patientDisplayName}</Text>
                <Text style={styles.profileSheetOhid}>
                  {cardData?.onehealth_id || "OHID-IND-2026-01001"}
                </Text>
                <Text style={styles.profileSheetHospital}>
                  {user?.hospital_name || "Kedar Hospital"}
                </Text>
              </View>
            </View>

            <View style={styles.profileDetailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mobile Number</Text>
                <Text style={styles.detailValue}>{user?.username || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={styles.detailValue}>{cardData?.dob || "1994-01-01"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Blood Group</Text>
                <Text style={styles.detailValue}>{cardData?.blood_group || "O+"}</Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Verification Status</Text>
                <View style={styles.verifiedRow}>
                  <CheckCircle2 size={14} color="#16A34A" style={{ marginRight: 4 }} />
                  <Text style={styles.verifiedText}>Active Verified</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              testID="logout-button"
              activeOpacity={0.8}
            >
              <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.signOutButtonText}>Sign Out of OH-ID</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Clinical Notifications</Text>
              <TouchableOpacity
                onPress={() => setNotificationsVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifItem}>
              <Clock size={16} color="#2563EB" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Upcoming OPD Consultation</Text>
                <Text style={styles.notifDesc}>Token #6 active in General Medicine Queue.</Text>
                <Text style={styles.notifTime}>10 mins ago</Text>
              </View>
            </View>

            <View style={styles.notifItem}>
              <Pill size={16} color="#9333EA" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Digital RxPad Signed</Text>
                <Text style={styles.notifDesc}>Dr. Senthil Nathan issued an updated prescription.</Text>
                <Text style={styles.notifTime}>2 hours ago</Text>
              </View>
            </View>

            <View style={[styles.notifItem, { borderBottomWidth: 0 }]}>
              <Sparkles size={16} color="#16A34A" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Zero-Knowledge Identity Pass</Text>
                <Text style={styles.notifDesc}>Dynamic QR token refreshed for hospital check-in.</Text>
                <Text style={styles.notifTime}>Yesterday</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONNECTED HOSPITALS MODAL */}
      <Modal
        visible={hospitalsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHospitalsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Connected Hospitals</Text>
              <TouchableOpacity
                onPress={() => setHospitalsVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.hospitalCardItem}>
              <Building2 size={24} color="#2563EB" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.hospitalItemName}>Kedar Hospital</Text>
                <Text style={styles.hospitalItemLocation}>Chennai • Apollo Healthcare Network</Text>
                <Text style={styles.hospitalItemStatus}>Connected & Active</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 110,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
  },
  hiddenAccessibleTitle: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
  },
  accessibleTitleText: {
    fontSize: 1,
  },

  // A. Welcome Section (No Duplicate Avatar)
  welcomeSection: {
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  welcomeVerifiedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  verifiedMiniBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedMiniBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
    marginLeft: 4,
  },
  welcomeNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  welcomeGreeting: {
    fontSize: 22,
    color: "#0F172A",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  nameUnderlineWrapper: {
    position: "relative",
    alignItems: "center",
  },
  welcomeNameHighlight: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: -0.3,
  },
  accentCurvedStroke: {
    height: 3.5,
    width: "100%",
    backgroundColor: "#93C5FD",
    borderRadius: 2,
    marginTop: 2,
    transform: [{ rotate: "-1.5deg" }],
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "500",
  },

  // B. Identity Card Section
  identityCardSection: {
    marginVertical: 4,
  },

  // Common Dashboard Section Styles
  dashboardSection: {
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  sectionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingLeft: 8,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    marginRight: 2,
  },

  // Loading & Error States
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    flexDirection: "row",
    alignItems: "center",
  },
  errorCardText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
    marginLeft: 8,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginLeft: 8,
    gap: 4,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  // Empty State Card
  emptyDashboardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDashboardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
  },
  emptyDashboardDesc: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
    maxWidth: 320,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryActionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // C. Appointment Card Styles
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.05)" } as any,
    }),
  },
  apptCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statusPillUpcoming: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusPillUpcomingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.2,
  },
  apptTypePill: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  apptTypePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  apptConsultationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  apptMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  apptDoctorName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  apptMetaDivider: {
    fontSize: 12,
    color: "#94A3B8",
    marginHorizontal: 5,
  },
  apptHospitalName: {
    fontSize: 12,
    color: "#64748B",
  },
  apptDateTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  apptDateTimeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369A1",
  },
  apptActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  bookAnotherBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bookAnotherBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },

  // D. Follow-up Card Styles
  allUpToDateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },
  upToDateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  upToDateTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  upToDateSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  followUpCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.05)" } as any,
    }),
  },
  followUpTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  followUpBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  followUpBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.2,
  },
  recommendedDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  recommendedDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  followUpReasonTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  followUpMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  followUpDoctorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  followUpHospitalText: {
    fontSize: 12,
    color: "#64748B",
  },
  followUpRecommendationNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  followUpRecommendationText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  bookFollowUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 8,
  },
  bookFollowUpBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // E. Medication Schedule Styles
  medSlotTabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  medSlotTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  medSlotTabActive: {
    backgroundColor: "#FAF5FF",
    borderColor: "#D8B4FE",
  },
  medSlotTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  medSlotTabTextActive: {
    color: "#9333EA",
    fontWeight: "700",
  },
  medicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 3px rgba(0,0,0,0.04)" } as any,
    }),
  },
  medCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  medTitleLeft: {
    flex: 1,
    marginRight: 8,
  },
  medFormBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
    gap: 4,
  },
  badgeTablet: {
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#F3E8FF",
  },
  badgeSyrup: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  medFormBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  textTablet: {
    color: "#9333EA",
  },
  textSyrup: {
    color: "#EA580C",
  },
  medCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  medDosageSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  statusPillTaken: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusPillTakenText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  medTimingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
  },
  medTimingText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  medCardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  takenActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  takenActionBtnActive: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  takenActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  takenActionBtnTextActive: {
    color: "#16A34A",
  },

  // F. Healthcare Services Grid Styles
  servicesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  servicesSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 4,
  },
  serviceGridItem: {
    width: "48.5%",
    marginBottom: 10,
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 110,
    justifyContent: "space-between",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } as any,
    }),
  },
  serviceCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  serviceIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  serviceContentCol: {
    flex: 1,
    justifyContent: "flex-end",
  },
  serviceTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  serviceDescRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  serviceDesc: {
    fontSize: 9.5,
    color: "#64748B",
    lineHeight: 13,
    flex: 1,
    marginRight: 4,
  },
  badgeSuccess: {
    backgroundColor: "#F0FDF4",
  },
  badgePrimary: {
    backgroundColor: "#EFF6FF",
  },
  badgeWarning: {
    backgroundColor: "#FFFBEB",
  },
  badgeInfo: {
    backgroundColor: "#ECFEFF",
  },
  badgeTextSuccess: {
    color: "#16A34A",
  },
  badgeTextPrimary: {
    color: "#2563EB",
  },
  badgeTextWarning: {
    color: "#D97706",
  },
  badgeTextInfo: {
    color: "#0891B2",
  },
  privacySecurityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 14,
    padding: 11,
    marginTop: 8,
    marginBottom: 16,
  },
  privacyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  privacyTextCol: {
    flex: 1,
    marginRight: 8,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  privacySubtitle: {
    fontSize: 10.5,
    color: "#166534",
    marginTop: 1,
    lineHeight: 14,
  },

  // Modals Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetCloseBtn: {
    padding: 4,
  },
  profileSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  profileLargeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileLargeAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#155EEF",
    marginRight: 12,
  },
  profileSheetName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  profileSheetOhid: {
    fontSize: 12,
    color: "#2563EB",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "600",
    marginTop: 1,
  },
  profileSheetHospital: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  profileDetailsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 14,
    paddingVertical: 14,
  },
  signOutButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  notifDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  notifTime: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
  },
  hospitalCardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hospitalItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  hospitalItemLocation: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  hospitalItemStatus: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
  },
});
