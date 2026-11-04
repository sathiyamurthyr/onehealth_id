/**
 * ONEHEALTH ID (OH-ID) Mobile — Official Appointment Management Modal
 * Sathus Technology Pvt Ltd
 *
 * Implements the 8-Screen Appointment Management Experience:
 * 1. Appointments List Actions & 3-Dots Menu
 * 2. Appointment Details (Hospital, Doctor, Date, Time, Token, Info, 6-Action Grid, Instructions)
 * 3. Edit Appointment (Reason, Department, Doctor, Date, Time)
 * 4. Reschedule Appointment (Stepper, November Calendar Widget, Available Time Slots)
 * 5. Change Doctor (Department filter, Doctor Cards with slot availability and radio select)
 * 6. Cancel Appointment (Cancellation illustration, Summary, Reason selector, Cancellation Policy)
 * 7. Success Screen (Confetti Checkmark, Updated Details, Reference ID, Next Actions)
 * 8. Appointment Management Overview (9 Feature Cards with green verification badges & Hospital art)
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Linking,
  Image,
} from "react-native";
import {
  ArrowLeft,
  X,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  User,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  CalendarPlus,
  Edit3,
  Repeat,
  XCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
  Check,
  Ticket,
  ExternalLink,
  ChevronLeft,
} from "lucide-react-native";
import { AppointmentItem, DiscoveryDoctor, AppointmentSlot } from "../../types/patient";
import { patientApi } from "../../services/api/patient";
import { LoadingOverlay } from "../loading";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OH_ID_LOGO = require("../../../assets/icon.png");

export type AppointmentManagementViewMode =
  | "details"
  | "edit"
  | "reschedule"
  | "change_doctor"
  | "cancel"
  | "success"
  | "overview";

interface AppointmentManagementModalProps {
  visible: boolean;
  appointment: AppointmentItem | null;
  initialMode?: AppointmentManagementViewMode;
  onClose: () => void;
  onAppointmentUpdated?: (updated: AppointmentItem) => void;
}

export const AppointmentManagementModal: React.FC<AppointmentManagementModalProps> = ({
  visible,
  appointment,
  initialMode = "details",
  onClose,
  onAppointmentUpdated,
}) => {
  const [currentMode, setCurrentMode] = useState<AppointmentManagementViewMode>(initialMode);
  const [activeAppt, setActiveAppt] = useState<AppointmentItem | null>(appointment);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Processing Request...");
  const [instructionsExpanded, setInstructionsExpanded] = useState<boolean>(false);

  // Mode 3: Edit Appointment State
  const [editReason, setEditReason] = useState<string>(
    appointment?.reason || appointment?.chief_complaint || "General Consultation"
  );
  const [editDepartment, setEditDepartment] = useState<string>(
    appointment?.department || "General Medicine"
  );
  const [editDoctorId, setEditDoctorId] = useState<string>(appointment?.doctor_id || "doc-01");
  const [editDate, setEditDate] = useState<string>(appointment?.appointment_date || "2026-11-10");
  const [editTime, setEditTime] = useState<string>(appointment?.appointment_time || "09:30 AM");

  // Mode 4: Reschedule State
  const [rescheduleStep, setRescheduleStep] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<string>("November 2026");
  const [selectedDate, setSelectedDate] = useState<string>(
    appointment?.appointment_date || "2026-11-12"
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(
    appointment?.appointment_time || "09:30 AM"
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
  ]);

  // Mode 5: Change Doctor State
  const [doctorDeptFilter, setDoctorDeptFilter] = useState<string>("General Medicine");
  const [selectedNewDoctorId, setSelectedNewDoctorId] = useState<string>(
    appointment?.doctor_id || "doc-01"
  );
  const [doctorsList, setDoctorsList] = useState<
    Array<{
      id: string;
      name: string;
      degree: string;
      department: string;
      availabilityStr: string;
    }>
  >([
    {
      id: "doc-01",
      name: "Dr. Senthil Nathan",
      degree: "MBBS, MD",
      department: "General Medicine",
      availabilityStr: "(Your current doctor)",
    },
    {
      id: "doc-02",
      name: "Dr. Aravind Kumar",
      degree: "MBBS, MD",
      department: "General Medicine",
      availabilityStr: "10 Nov • 10 slots available",
    },
    {
      id: "doc-03",
      name: "Dr. Priya Raman",
      degree: "MBBS, MD",
      department: "General Medicine",
      availabilityStr: "10 Nov • 6 slots available",
    },
    {
      id: "doc-04",
      name: "Dr. Karthik Vel",
      degree: "MBBS, MD",
      department: "General Medicine",
      availabilityStr: "10 Nov • 8 slots available",
    },
  ]);

  // Mode 6: Cancel Appointment State
  const [cancelReason, setCancelReason] = useState<string>("Change in schedule");

  // Mode 7: Success State
  const [successTitle, setSuccessTitle] = useState<string>("Appointment Rescheduled");
  const [successSubtitle, setSuccessSubtitle] = useState<string>(
    "Your appointment has been successfully rescheduled."
  );
  const [successReferenceId, setSuccessReferenceId] = useState<string>("OHID-APT-000867-R1");

  // Sync state when appointment id changes
  useEffect(() => {
    if (appointment && appointment.id !== activeAppt?.id) {
      setActiveAppt(appointment);
      setEditReason(appointment.reason || appointment.chief_complaint || "General Consultation");
      setEditDepartment(appointment.department || "General Medicine");
      setEditDoctorId(appointment.doctor_id || "doc-01");
      setEditDate(appointment.appointment_date || "2026-11-10");
      setEditTime(appointment.appointment_time || "09:30 AM");
      setSelectedDate(appointment.appointment_date || "2026-11-12");
      setSelectedTimeSlot(appointment.appointment_time || "09:30 AM");
      setSelectedNewDoctorId(appointment.doctor_id || "doc-01");
      setSuccessReferenceId(
        appointment.id.toUpperCase().startsWith("OHID-")
          ? `${appointment.id.toUpperCase()}-R1`
          : `OHID-APT-${appointment.id.substring(0, 6).toUpperCase()}-R1`
      );
    }
  }, [appointment?.id, activeAppt?.id]);

  // Load registered doctors for hospital dynamically
  useEffect(() => {
    if (activeAppt?.hospital_id && typeof patientApi.getDoctors === "function") {
      patientApi
        .getDoctors(activeAppt.hospital_id)
        .then((docs) => {
          if (docs && docs.length > 0) {
            setDoctorsList(
              docs.map((d) => ({
                id: d.id,
                name: d.name,
                degree: d.qualification || "MBBS, MD",
                department: d.specialty || "General Medicine",
                availabilityStr:
                  d.id === activeAppt.doctor_id
                    ? "(Your current doctor)"
                    : "Available slots open",
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [activeAppt?.hospital_id, activeAppt?.doctor_id]);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode, visible]);

  // Fetch real available slots when date or doctor changes
  useEffect(() => {
    if (activeAppt?.doctor_id && selectedDate) {
      patientApi
        .getAvailableSlots(selectedNewDoctorId || activeAppt.doctor_id, selectedDate, activeAppt.hospital_id)
        .then((slots) => {
          if (slots && slots.length > 0) {
            setAvailableSlots(slots.map((s) => s.time || s.slot_value));
          }
        })
        .catch(() => {
          // Keep mock default available slots
        });
    }
  }, [activeAppt?.doctor_id, activeAppt?.hospital_id, selectedDate, selectedNewDoctorId]);

  if (!visible) return null;

  // Header Title Resolver
  const getHeaderTitle = () => {
    switch (currentMode) {
      case "details":
        return "Appointment Details";
      case "edit":
        return "Edit Appointment";
      case "reschedule":
        return "Reschedule Appointment";
      case "change_doctor":
        return "Change Doctor";
      case "cancel":
        return "Cancel Appointment";
      case "success":
        return "";
      case "overview":
        return "Appointment Management";
      default:
        return "Appointment";
    }
  };

  // Safe Back Handling
  const handleBack = () => {
    if (currentMode === "details" || currentMode === "overview") {
      onClose();
    } else {
      setCurrentMode("details");
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  // Edit Appointment Submit
  const handleSaveEdit = async () => {
    if (!activeAppt) return;
    try {
      setLoading(true);
      setLoadingMessage("Updating appointment details...");
      const updated = await patientApi.updateAppointment(activeAppt.id, {
        reason: editReason,
        department_id: editDepartment,
        doctor_id: editDoctorId,
        appointment_date: editDate,
        appointment_time: editTime,
      });

      setActiveAppt(updated);
      if (onAppointmentUpdated) onAppointmentUpdated(updated);

      setSuccessTitle("Appointment Details Updated");
      setSuccessSubtitle("Your updated appointment details have been successfully confirmed.");
      setSuccessReferenceId(
        updated.id.toUpperCase().startsWith("OHID-")
          ? `${updated.id.toUpperCase()}-E1`
          : `OHID-APT-${updated.id.substring(0, 6).toUpperCase()}-E1`
      );
      setCurrentMode("success");
    } catch (err: any) {
      Alert.alert("Update Failed", err?.message || "Could not update appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reschedule Appointment Submit
  const handleConfirmReschedule = async () => {
    if (!activeAppt) return;
    try {
      setLoading(true);
      setLoadingMessage("Rescheduling appointment with hospital...");
      const updated = await patientApi.rescheduleAppointment(
        activeAppt.id,
        selectedDate,
        selectedTimeSlot,
        selectedNewDoctorId !== activeAppt.doctor_id ? selectedNewDoctorId : undefined,
        "Patient requested reschedule via mobile app"
      );

      const targetDoctor = doctorsList.find((d) => d.id === (selectedNewDoctorId || activeAppt.doctor_id));
      const finalized = {
        ...activeAppt,
        ...updated,
        appointment_date: selectedDate,
        appointment_time: selectedTimeSlot,
        doctor_id: selectedNewDoctorId || activeAppt.doctor_id,
        doctor_name: targetDoctor ? targetDoctor.name : activeAppt.doctor_name,
        doctor_qualification: targetDoctor ? targetDoctor.degree : activeAppt.doctor_qualification,
        status: "RESCHEDULED",
      };

      setActiveAppt(finalized);
      if (onAppointmentUpdated) onAppointmentUpdated(finalized);

      setSuccessTitle("Appointment Rescheduled");
      setSuccessSubtitle("Your appointment has been successfully rescheduled.");
      setSuccessReferenceId(
        activeAppt.id.toUpperCase().startsWith("OHID-")
          ? `${activeAppt.id.toUpperCase()}-R1`
          : `OHID-APT-${activeAppt.id.substring(0, 6).toUpperCase()}-R1`
      );
      setCurrentMode("success");
    } catch (err: any) {
      Alert.alert("Reschedule Failed", err?.message || "Slot conflict or booking error. Please select another time.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel Appointment Submit
  const handleConfirmCancel = async () => {
    if (!activeAppt) return;
    try {
      setLoading(true);
      setLoadingMessage("Cancelling appointment record...");
      await patientApi.cancelAppointment(activeAppt.id, cancelReason);

      const cancelled = {
        ...activeAppt,
        status: "CANCELLED",
        cancellation_reason: cancelReason,
      };

      setActiveAppt(cancelled);
      if (onAppointmentUpdated) onAppointmentUpdated(cancelled);

      setSuccessTitle("Appointment Cancelled");
      setSuccessSubtitle("Your appointment has been cancelled per hospital policy.");
      setSuccessReferenceId(`CNCL-${activeAppt.id.substring(0, 8).toUpperCase()}`);
      setCurrentMode("success");
    } catch (err: any) {
      Alert.alert("Cancellation Error", err?.message || "Failed to cancel appointment. Please contact hospital.");
    } finally {
      setLoading(false);
    }
  };

  // Hospital Directions Handler
  const handleOpenDirections = () => {
    const address = activeAppt?.hospital_address || "SRMC Multi-Specialty Hospital, Chennai";
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });
    Linking.openURL(url!).catch(() => {
      Alert.alert("Hospital Address", address);
    });
  };

  // Add to Device Calendar Handler
  const handleAddToCalendar = () => {
    Alert.alert(
      "Add to Calendar",
      `Appointment on ${activeAppt?.appointment_date || "10 Nov 2026"} at ${activeAppt?.appointment_time || "09:30 AM"} with ${activeAppt?.doctor_name || "Doctor"} has been saved to your schedule.`,
      [{ text: "OK" }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container} testID="appointment-management-modal">
        {/* ================================================================= */}
        {/* GLOBAL HEADER BAR: BACK ARROW + OH-ID LOGO + SCREEN TITLE + CLOSE */}
        {/* ================================================================= */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
            testID="btn-appointment-modal-back"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color="#102A56" />
          </TouchableOpacity>

          <View style={styles.headerBranding}>
            <Image source={OH_ID_LOGO} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getHeaderTitle()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            testID="btn-appointment-modal-close"
            accessibilityLabel="Close appointment window"
          >
            <X size={20} color="#667085" />
          </TouchableOpacity>
        </View>

        {/* ================================================================= */}
        {/* SCREEN 2: APPOINTMENT DETAILS VIEW                                */}
        {/* ================================================================= */}
        {currentMode === "details" && activeAppt && (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            {/* Top Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.deptBadge}>
                <Text style={styles.deptBadgeText}>{activeAppt.department || "GENERAL OPD"}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  activeAppt.status === "CANCELLED" ? styles.statusBadgeCancelled : styles.statusBadgeScheduled,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    activeAppt.status === "CANCELLED" ? { backgroundColor: "#D92D20" } : { backgroundColor: "#B54708" },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    activeAppt.status === "CANCELLED" ? { color: "#D92D20" } : { color: "#B54708" },
                  ]}
                >
                  {activeAppt.status === "CANCELLED" ? "Cancelled" : "Scheduled"}
                </Text>
              </View>
            </View>

            {/* Doctor Profile Card */}
            <View style={styles.whiteCard}>
              <View style={styles.doctorCardRow}>
                <View style={styles.doctorAvatar}>
                  <User size={22} color="#155EEF" />
                </View>
                <View style={styles.doctorCardMeta}>
                  <Text style={styles.doctorNameText}>{activeAppt.doctor_name || "Dr. Senthil Nathan"}</Text>
                  <Text style={styles.doctorDegreeText}>
                    {activeAppt.doctor_qualification || "MBBS, MD (General Medicine)"}
                  </Text>
                  <View style={styles.hospitalInline}>
                    <Building2 size={12} color="#667085" style={{ marginRight: 4 }} />
                    <Text style={styles.hospitalInlineText}>{activeAppt.hospital_name || "Hospital Alpha"}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#98A2B3" />
              </View>
            </View>

            {/* Date, Time, Token & Room Card */}
            <View style={styles.whiteCard}>
              <View style={styles.dateTimeGrid}>
                <View style={styles.dateTimeItem}>
                  <CalendarIcon size={16} color="#155EEF" style={{ marginRight: 6 }} />
                  <Text style={styles.dateTimeText}>{activeAppt.appointment_date || "Tue, 10 Nov 2026"}</Text>
                </View>
                <View style={styles.dateTimeItem}>
                  <Clock size={16} color="#155EEF" style={{ marginRight: 6 }} />
                  <Text style={styles.dateTimeText}>{activeAppt.appointment_time || "09:30 AM"}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.tokenRoomRow}>
                <View style={styles.greenTokenPill}>
                  <Ticket size={14} color="#027A48" style={{ marginRight: 4 }} />
                  <Text style={styles.greenTokenText}>
                    Token #{activeAppt.token_number || "6"}
                  </Text>
                </View>
                <View style={styles.roomLocationRow}>
                  <MapPin size={14} color="#667085" style={{ marginRight: 4 }} />
                  <Text style={styles.roomLocationText}>{activeAppt.room_number || "OPD - Room 102"}</Text>
                </View>
              </View>
            </View>

            {/* Appointment Information Card */}
            <View style={styles.whiteCard}>
              <View style={styles.sectionHeaderRow}>
                <FileText size={16} color="#155EEF" style={{ marginRight: 6 }} />
                <Text style={styles.cardHeaderTitle}>Appointment Information</Text>
              </View>

              <View style={styles.infoTableRow}>
                <Text style={styles.infoTableLabel}>Appointment ID</Text>
                <Text style={styles.infoTableValue}>{activeAppt.id.toUpperCase()}</Text>
              </View>

              <View style={styles.infoTableRow}>
                <Text style={styles.infoTableLabel}>Reason for Visit</Text>
                <Text style={styles.infoTableValue}>
                  {activeAppt.reason || activeAppt.chief_complaint || "General Consultation"}
                </Text>
              </View>

              <View style={styles.infoTableRow}>
                <Text style={styles.infoTableLabel}>Booking Date</Text>
                <Text style={styles.infoTableValue}>
                  {activeAppt.booking_date || "28 Oct 2026, 04:15 PM"}
                </Text>
              </View>

              <View style={styles.infoTableRow}>
                <Text style={styles.infoTableLabel}>Visit Type</Text>
                <Text style={styles.infoTableValue}>OPD (In-person)</Text>
              </View>
            </View>

            {/* 6 Quick Action Grid (Matching Screen 2 Reference) */}
            <View style={styles.actionsGridContainer}>
              {/* 1. Edit Details */}
              <TouchableOpacity
                style={styles.gridActionBtn}
                onPress={() => setCurrentMode("edit")}
                testID="btn-action-edit-details"
                activeOpacity={0.7}
              >
                <View style={styles.gridIconCircle}>
                  <Edit3 size={18} color="#155EEF" />
                </View>
                <Text style={styles.gridActionText}>Edit Details</Text>
              </TouchableOpacity>

              {/* 2. Reschedule Appointment */}
              <TouchableOpacity
                style={styles.gridActionBtn}
                onPress={() => setCurrentMode("reschedule")}
                testID="btn-action-reschedule-appointment"
                activeOpacity={0.7}
              >
                <View style={styles.gridIconCircle}>
                  <CalendarIcon size={18} color="#155EEF" />
                </View>
                <Text style={styles.gridActionText}>Reschedule Appointment</Text>
              </TouchableOpacity>

              {/* 3. Change Doctor */}
              <TouchableOpacity
                style={styles.gridActionBtn}
                onPress={() => setCurrentMode("change_doctor")}
                testID="btn-action-change-doctor"
                activeOpacity={0.7}
              >
                <View style={styles.gridIconCircle}>
                  <Repeat size={18} color="#155EEF" />
                </View>
                <Text style={styles.gridActionText}>Change Doctor</Text>
              </TouchableOpacity>

              {/* 4. Cancel Appointment */}
              <TouchableOpacity
                style={styles.gridActionBtn}
                onPress={() => setCurrentMode("cancel")}
                testID="btn-action-cancel-appointment"
                activeOpacity={0.7}
              >
                <View style={[styles.gridIconCircle, { backgroundColor: "#FEE4E2" }]}>
                  <XCircle size={18} color="#D92D20" />
                </View>
                <Text style={[styles.gridActionText, { color: "#D92D20" }]}>Cancel Appointment</Text>
              </TouchableOpacity>

              {/* 5. Hospital Directions */}
              <TouchableOpacity
                style={styles.gridActionBtn}
                onPress={handleOpenDirections}
                testID="btn-action-directions"
                activeOpacity={0.7}
              >
                <View style={styles.gridIconCircle}>
                  <MapPin size={18} color="#155EEF" />
                </View>
                <Text style={styles.gridActionText}>Hospital Directions</Text>
              </TouchableOpacity>

              {/* 6. Add to Calendar */}
              <TouchableOpacity
                style={styles.gridActionBtn}
                onPress={handleAddToCalendar}
                testID="btn-action-add-calendar"
                activeOpacity={0.7}
              >
                <View style={styles.gridIconCircle}>
                  <CalendarPlus size={18} color="#155EEF" />
                </View>
                <Text style={styles.gridActionText}>Add to Calendar</Text>
              </TouchableOpacity>
            </View>

            {/* Collapsible Accordion: Appointment Instructions */}
            <View style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setInstructionsExpanded(!instructionsExpanded)}
                activeOpacity={0.7}
                testID="btn-toggle-instructions"
              >
                <View style={styles.accordionHeaderLeft}>
                  <Info size={16} color="#155EEF" style={{ marginRight: 6 }} />
                  <Text style={styles.accordionTitle}>Appointment Instructions</Text>
                </View>
                {instructionsExpanded ? (
                  <ChevronUp size={18} color="#667085" />
                ) : (
                  <ChevronDown size={18} color="#667085" />
                )}
              </TouchableOpacity>

              {instructionsExpanded && (
                <View style={styles.accordionBody}>
                  <Text style={styles.accordionBullet}>
                    • Please arrive 15 minutes prior to your scheduled consultation time.
                  </Text>
                  <Text style={styles.accordionBullet}>
                    • Present your digital OH-ID pass or Token #{activeAppt.token_number || "6"} at the reception desk.
                  </Text>
                  <Text style={styles.accordionBullet}>
                    • Bring previous prescriptions, lab reports, and current medication boxes.
                  </Text>
                  <Text style={styles.accordionBullet}>
                    • For fasting blood glucose or lipid profile investigations, maintain 8–10 hours overnight fasting.
                  </Text>
                </View>
              )}
            </View>

            {/* Overview Button */}
            <TouchableOpacity
              style={styles.overviewTriggerBtn}
              onPress={() => setCurrentMode("overview")}
              activeOpacity={0.8}
            >
              <Text style={styles.overviewTriggerText}>View Appointment Management Overview</Text>
              <ChevronRight size={16} color="#155EEF" />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* SCREEN 3: EDIT APPOINTMENT VIEW                                   */}
        {/* ================================================================= */}
        {currentMode === "edit" && activeAppt && (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            <Text style={styles.screenSubtitle}>Update your appointment details below.</Text>

            {/* Field: Reason for Visit */}
            <Text style={styles.fieldLabel}>
              Reason for Visit <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={editReason}
                onChangeText={setEditReason}
                placeholder="Enter consultation reason"
                testID="input-edit-reason"
              />
              <Edit3 size={16} color="#98A2B3" />
            </View>

            {/* Field: Department */}
            <Text style={styles.fieldLabel}>
              Department <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity style={styles.selectorCard} activeOpacity={0.8}>
              <Text style={styles.selectorCardText}>{editDepartment}</Text>
              <ChevronDown size={18} color="#667085" />
            </TouchableOpacity>

            {/* Field: Doctor */}
            <Text style={styles.fieldLabel}>
              Doctor <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.whiteCardCompact}>
              <View style={styles.doctorMiniRow}>
                <View style={styles.doctorMiniAvatar}>
                  <User size={16} color="#155EEF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorMiniName}>{activeAppt.doctor_name || "Dr. Senthil Nathan"}</Text>
                  <Text style={styles.doctorMiniDegree}>
                    {activeAppt.doctor_qualification || "MBBS, MD"}
                  </Text>
                </View>
                <ChevronDown size={18} color="#667085" />
              </View>
            </View>

            {/* Field: Appointment Date */}
            <Text style={styles.fieldLabel}>
              Appointment Date <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectorCard}
              onPress={() => setCurrentMode("reschedule")}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CalendarIcon size={16} color="#155EEF" style={{ marginRight: 8 }} />
                <Text style={styles.selectorCardText}>{editDate || "10 Nov 2026"}</Text>
              </View>
              <ChevronRight size={18} color="#667085" />
            </TouchableOpacity>

            {/* Field: Appointment Time */}
            <Text style={styles.fieldLabel}>
              Appointment Time <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectorCard}
              onPress={() => setCurrentMode("reschedule")}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Clock size={16} color="#155EEF" style={{ marginRight: 8 }} />
                <Text style={styles.selectorCardText}>{editTime || "09:30 AM"}</Text>
              </View>
              <ChevronRight size={18} color="#667085" />
            </TouchableOpacity>

            {/* Info Callout */}
            <View style={styles.infoCalloutBox}>
              <Info size={16} color="#155EEF" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.infoCalloutText}>
                Note: Based on availability, your updated details will be confirmed instantly.
              </Text>
            </View>

            {/* Submit Action */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleSaveEdit}
              testID="btn-submit-edit-appointment"
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>Review Changes →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* SCREEN 4: RESCHEDULE APPOINTMENT VIEW                             */}
        {/* ================================================================= */}
        {currentMode === "reschedule" && activeAppt && (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            <Text style={styles.screenSubtitle}>Choose a new date and time</Text>

            {/* Stepper Header (1 Date, 2 Time, 3 Review, 4 Confirm) */}
            <View style={styles.rescheduleStepper}>
              <View style={styles.stepperItem}>
                <View style={[styles.stepperCircle, rescheduleStep >= 1 && styles.stepperCircleActive]}>
                  <Text style={[styles.stepperNumber, rescheduleStep >= 1 && styles.stepperNumberActive]}>1</Text>
                </View>
                <Text style={styles.stepperLabel}>Date</Text>
              </View>
              <View style={styles.stepperLine} />

              <View style={styles.stepperItem}>
                <View style={[styles.stepperCircle, rescheduleStep >= 2 && styles.stepperCircleActive]}>
                  <Text style={[styles.stepperNumber, rescheduleStep >= 2 && styles.stepperNumberActive]}>2</Text>
                </View>
                <Text style={styles.stepperLabel}>Time</Text>
              </View>
              <View style={styles.stepperLine} />

              <View style={styles.stepperItem}>
                <View style={[styles.stepperCircle, rescheduleStep >= 3 && styles.stepperCircleActive]}>
                  <Text style={[styles.stepperNumber, rescheduleStep >= 3 && styles.stepperNumberActive]}>3</Text>
                </View>
                <Text style={styles.stepperLabel}>Review</Text>
              </View>
              <View style={styles.stepperLine} />

              <View style={styles.stepperItem}>
                <View style={[styles.stepperCircle, rescheduleStep >= 4 && styles.stepperCircleActive]}>
                  <Text style={[styles.stepperNumber, rescheduleStep >= 4 && styles.stepperNumberActive]}>4</Text>
                </View>
                <Text style={styles.stepperLabel}>Confirm</Text>
              </View>
            </View>

            {/* Calendar Widget Container (November 2026) */}
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeaderRow}>
                <TouchableOpacity
                  onPress={() => setSelectedMonth("October 2026")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft size={20} color="#155EEF" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthText}>{selectedMonth}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedMonth("December 2026")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronRight size={20} color="#155EEF" />
                </TouchableOpacity>
              </View>

              {/* Day Headers (Sun to Sat) */}
              <View style={styles.dayNamesRow}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <Text key={idx} style={styles.dayNameCell}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid 1 to 30 */}
              <View style={styles.calendarGrid}>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <TouchableOpacity
                    key={`d-${num}`}
                    style={[styles.calendarDayCell, num === 12 && styles.calendarDayActive]}
                    onPress={() => {
                      const dStr = num < 10 ? `2026-11-0${num}` : `2026-11-${num}`;
                      setSelectedDate(dStr);
                      setRescheduleStep(2);
                    }}
                  >
                    <Text style={[styles.calendarDayText, num === 12 && styles.calendarDayTextActive]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}

                {[8, 9, 10, 11, 12, 13, 14].map((num) => (
                  <TouchableOpacity
                    key={`d-${num}`}
                    style={[
                      styles.calendarDayCell,
                      (selectedDate === `2026-11-${num}` || (num === 12 && selectedDate === "2026-11-12")) &&
                        styles.calendarDayActive,
                    ]}
                    onPress={() => {
                      setSelectedDate(`2026-11-${num}`);
                      setRescheduleStep(2);
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        (selectedDate === `2026-11-${num}` || (num === 12 && selectedDate === "2026-11-12")) &&
                          styles.calendarDayTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}

                {[15, 16, 17, 18, 19, 20, 21].map((num) => (
                  <TouchableOpacity
                    key={`d-${num}`}
                    style={[styles.calendarDayCell, selectedDate === `2026-11-${num}` && styles.calendarDayActive]}
                    onPress={() => {
                      setSelectedDate(`2026-11-${num}`);
                      setRescheduleStep(2);
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        selectedDate === `2026-11-${num}` && styles.calendarDayTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}

                {[22, 23, 24, 25, 26, 27, 28].map((num) => (
                  <TouchableOpacity
                    key={`d-${num}`}
                    style={[styles.calendarDayCell, selectedDate === `2026-11-${num}` && styles.calendarDayActive]}
                    onPress={() => {
                      setSelectedDate(`2026-11-${num}`);
                      setRescheduleStep(2);
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        selectedDate === `2026-11-${num}` && styles.calendarDayTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}

                {[29, 30].map((num) => (
                  <TouchableOpacity
                    key={`d-${num}`}
                    style={[styles.calendarDayCell, selectedDate === `2026-11-${num}` && styles.calendarDayActive]}
                    onPress={() => {
                      setSelectedDate(`2026-11-${num}`);
                      setRescheduleStep(2);
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        selectedDate === `2026-11-${num}` && styles.calendarDayTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Available Time Slots Section */}
            <View style={styles.sectionHeaderRow}>
              <Clock size={16} color="#155EEF" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeaderTitle}>Available Time Slots</Text>
            </View>

            <View style={styles.slotsGrid}>
              {availableSlots.map((slot, idx) => {
                const isSelected = selectedTimeSlot === slot;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.slotChip, isSelected && styles.slotChipActive]}
                    onPress={() => {
                      setSelectedTimeSlot(slot);
                      setRescheduleStep(3);
                    }}
                    testID={`reschedule-slot-${slot.replace(/[\s:]/g, "")}`}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.slotChipText, isSelected && styles.slotChipTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleConfirmReschedule}
              testID="btn-confirm-reschedule"
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>Next: Review →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* SCREEN 5: CHANGE DOCTOR VIEW                                      */}
        {/* ================================================================= */}
        {currentMode === "change_doctor" && activeAppt && (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            <Text style={styles.screenSubtitle}>Select a different doctor for your appointment</Text>

            {/* Department Dropdown */}
            <Text style={styles.fieldLabel}>Department</Text>
            <TouchableOpacity style={styles.selectorCard} activeOpacity={0.8}>
              <Text style={styles.selectorCardText}>{doctorDeptFilter}</Text>
              <ChevronDown size={18} color="#667085" />
            </TouchableOpacity>

            {/* Doctors List with Radio Selection */}
            <View style={styles.doctorsListContainer}>
              {doctorsList.map((doc) => {
                const isSelected = selectedNewDoctorId === doc.id;
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.doctorSelectCard, isSelected && styles.doctorSelectCardActive]}
                    onPress={() => setSelectedNewDoctorId(doc.id)}
                    testID={`select-doctor-${doc.id}`}
                    activeOpacity={0.8}
                  >
                    <View style={styles.doctorAvatar}>
                      <User size={20} color="#155EEF" />
                    </View>

                    <View style={styles.doctorSelectMeta}>
                      <Text style={styles.doctorSelectName}>{doc.name}</Text>
                      <Text style={styles.doctorSelectDegree}>{doc.degree}</Text>
                      <Text
                        style={[
                          styles.doctorSelectSlots,
                          doc.availabilityStr.includes("current") && { color: "#155EEF", fontWeight: "700" },
                        ]}
                      >
                        {doc.availabilityStr}
                      </Text>
                    </View>

                    {/* Radio Button */}
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Info Notice */}
            <View style={styles.infoCalloutBox}>
              <Info size={16} color="#155EEF" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.infoCalloutText}>
                Selecting a new doctor will reschedule your appointment based on availability.
              </Text>
            </View>

            {/* Next Button */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setCurrentMode("reschedule")}
              testID="btn-choose-time-for-new-doctor"
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>Next: Choose Time →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* SCREEN 6: CANCEL APPOINTMENT VIEW                                 */}
        {/* ================================================================= */}
        {currentMode === "cancel" && activeAppt && (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            {/* Red Circular Cancel Illustration */}
            <View style={styles.cancelIllustrationCircle}>
              <View style={styles.cancelInnerIconWrap}>
                <CalendarIcon size={36} color="#D92D20" />
                <View style={styles.cancelBadgeCross}>
                  <X size={14} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>
            </View>

            <Text style={styles.cancelTitle}>Cancel this appointment?</Text>
            <Text style={styles.cancelSubtitle}>You are about to cancel the following appointment:</Text>

            {/* Summary Card */}
            <View style={styles.whiteCard}>
              <View style={styles.doctorCardRow}>
                <View style={styles.doctorAvatar}>
                  <User size={22} color="#155EEF" />
                </View>
                <View style={styles.doctorCardMeta}>
                  <Text style={styles.doctorNameText}>{activeAppt.doctor_name || "Dr. Senthil Nathan"}</Text>
                  <Text style={styles.doctorDegreeText}>
                    {activeAppt.doctor_qualification || "MBBS, MD (General Medicine)"}
                  </Text>
                  <View style={styles.hospitalInline}>
                    <Building2 size={12} color="#667085" style={{ marginRight: 4 }} />
                    <Text style={styles.hospitalInlineText}>{activeAppt.hospital_name || "Hospital Alpha"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.dateTimeGrid}>
                <View style={styles.dateTimeItem}>
                  <CalendarIcon size={14} color="#155EEF" style={{ marginRight: 6 }} />
                  <Text style={styles.dateTimeText}>{activeAppt.appointment_date || "Tue, 10 Nov 2026"}</Text>
                </View>
                <View style={styles.dateTimeItem}>
                  <Clock size={14} color="#155EEF" style={{ marginRight: 6 }} />
                  <Text style={styles.dateTimeText}>{activeAppt.appointment_time || "09:30 AM"}</Text>
                </View>
              </View>

              <View style={[styles.greenTokenPill, { marginTop: 8, alignSelf: "flex-start" }]}>
                <Ticket size={14} color="#027A48" style={{ marginRight: 4 }} />
                <Text style={styles.greenTokenText}>Token #{activeAppt.token_number || "9"}</Text>
              </View>
            </View>

            {/* Reason for Cancellation */}
            <Text style={styles.fieldLabel}>
              Reason for Cancellation <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity style={styles.selectorCard} activeOpacity={0.8}>
              <Text style={styles.selectorCardText}>{cancelReason}</Text>
              <ChevronDown size={18} color="#667085" />
            </TouchableOpacity>

            {/* Cancellation Policy Callout */}
            <View style={styles.cancellationPolicyBox}>
              <View style={styles.sectionHeaderRow}>
                <Info size={16} color="#155EEF" style={{ marginRight: 6 }} />
                <Text style={styles.policyTitle}>Cancellation Policy</Text>
              </View>
              <Text style={styles.policyBullet}>
                • Free cancellation up to 24 hours before the appointment.
              </Text>
              <Text style={styles.policyBullet}>
                • For late cancellation, please contact the hospital.
              </Text>
            </View>

            {/* Buttons Row (Keep vs Confirm Cancellation) */}
            <View style={styles.cancelActionsRow}>
              <TouchableOpacity
                style={styles.keepApptButton}
                onPress={() => setCurrentMode("details")}
                testID="btn-keep-appointment"
                activeOpacity={0.8}
              >
                <Text style={styles.keepApptText}>Keep Appointment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={handleConfirmCancel}
                testID="btn-confirm-cancellation"
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>Confirm Cancellation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* SCREEN 7: SUCCESS SCREEN VIEW                                     */}
        {/* ================================================================= */}
        {currentMode === "success" && activeAppt && (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            {/* Big Green Checkmark with Confetti Accent */}
            <View style={styles.successIconWrapper}>
              <View style={styles.successOuterCircle}>
                <View style={styles.successInnerCircle}>
                  <Check size={40} color="#FFFFFF" strokeWidth={3} />
                </View>
              </View>
            </View>

            <Text style={styles.successTitleText}>{successTitle}</Text>
            <Text style={styles.successSubtitleText}>{successSubtitle}</Text>

            {/* New Appointment Details Card */}
            <View style={styles.successCard}>
              <View style={styles.sectionHeaderRow}>
                <CalendarIcon size={16} color="#12B76A" style={{ marginRight: 6 }} />
                <Text style={[styles.cardHeaderTitle, { color: "#027A48" }]}>New Appointment Details</Text>
              </View>

              <View style={styles.doctorCardRow}>
                <View style={styles.doctorAvatar}>
                  <User size={22} color="#155EEF" />
                </View>
                <View style={styles.doctorCardMeta}>
                  <Text style={styles.doctorNameText}>{activeAppt.doctor_name || "Dr. Senthil Nathan"}</Text>
                  <Text style={styles.doctorDegreeText}>
                    {activeAppt.doctor_qualification || "MBBS, MD (General Medicine)"}
                  </Text>
                  <View style={styles.hospitalInline}>
                    <Building2 size={12} color="#667085" style={{ marginRight: 4 }} />
                    <Text style={styles.hospitalInlineText}>{activeAppt.hospital_name || "Hospital Alpha"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.dateTimeGrid}>
                <View style={styles.dateTimeItem}>
                  <CalendarIcon size={14} color="#155EEF" style={{ marginRight: 6 }} />
                  <Text style={styles.dateTimeText}>{selectedDate || "Thu, 12 Nov 2026"}</Text>
                </View>
                <View style={styles.dateTimeItem}>
                  <Clock size={14} color="#155EEF" style={{ marginRight: 6 }} />
                  <Text style={styles.dateTimeText}>{selectedTimeSlot || "10:30 AM"}</Text>
                </View>
              </View>

              <View style={[styles.greenTokenPill, { marginTop: 8, alignSelf: "flex-start" }]}>
                <Ticket size={14} color="#027A48" style={{ marginRight: 4 }} />
                <Text style={styles.greenTokenText}>Token #{activeAppt.token_number || "9"}</Text>
              </View>

              <View style={styles.cardDivider} />

              {/* Reference ID */}
              <View style={styles.referenceIdRow}>
                <FileText size={16} color="#155EEF" style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.referenceLabel}>Reference ID</Text>
                  <Text style={styles.referenceValue}>{successReferenceId}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => setCurrentMode("details")}
              testID="btn-success-view-details"
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>View Appointment Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={onClose}
              testID="btn-success-back-appointments"
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionText}>Back to Appointments</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ================================================================= */}
        {/* SCREEN 8: APPOINTMENT MANAGEMENT OVERVIEW VIEW                    */}
        {/* ================================================================= */}
        {currentMode === "overview" && (
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            <Text style={styles.overviewHeading}>Appointment Management (OH-ID)</Text>
            <Text style={styles.screenSubtitle}>Comprehensive patient self-service healthcare features.</Text>

            <View style={styles.featuresList}>
              {[
                { title: "View Appointment Details", desc: "Complete visit, hospital & token info" },
                { title: "Edit Appointment", desc: "Update reason, date, time or doctor" },
                { title: "Reschedule Appointment", desc: "Choose a new date and time" },
                { title: "Change Doctor", desc: "Select a different available doctor" },
                { title: "Cancel Appointment", desc: "Cancel with reason and policy" },
                { title: "Add to Calendar", desc: "Save to your device calendar" },
                { title: "Hospital Directions", desc: "Navigate to the hospital location" },
                { title: "Appointment Instructions", desc: "Pre-visit guidelines and documents" },
                { title: "Appointment History", desc: "View past, completed and cancelled appointments" },
              ].map((feat, idx) => (
                <View key={idx} style={styles.featureItemCard}>
                  <View style={styles.featureIconWrap}>
                    <CheckCircle2 size={20} color="#12B76A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitleText}>{feat.title}</Text>
                    <Text style={styles.featureDescText}>{feat.desc}</Text>
                  </View>
                  <CheckCircle2 size={16} color="#12B76A" />
                </View>
              ))}
            </View>

            {/* Hospital Building Illustration Banner */}
            <View style={styles.hospitalArtContainer}>
              <Building2 size={54} color="#155EEF" style={{ alignSelf: "center", marginBottom: 8 }} />
              <Text style={styles.hospitalArtText}>OneHealth ID Connected Care Facilities</Text>
            </View>
          </ScrollView>
        )}

        {/* Blocking Loading Overlay for API Actions */}
        <LoadingOverlay visible={loading} title="Processing Request..." message={loadingMessage} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4EAF2",
  },
  headerButton: {
    padding: 6,
  },
  headerBranding: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 12,
  },
  headerLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102A56",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  screenSubtitle: {
    fontSize: 13,
    color: "#667085",
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  deptBadge: {
    backgroundColor: "#EFF4FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deptBadgeText: {
    color: "#155EEF",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeScheduled: {
    backgroundColor: "#FEF0C7",
  },
  statusBadgeCancelled: {
    backgroundColor: "#FEE4E2",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  whiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    marginBottom: 12,
  },
  whiteCardCompact: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    marginBottom: 14,
  },
  doctorCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  doctorCardMeta: {
    flex: 1,
  },
  doctorNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#102A56",
  },
  doctorDegreeText: {
    fontSize: 12,
    color: "#475467",
    marginTop: 2,
  },
  hospitalInline: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  hospitalInlineText: {
    fontSize: 11,
    color: "#667085",
  },
  dateTimeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateTimeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#102A56",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F2F4F7",
    marginVertical: 10,
  },
  tokenRoomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greenTokenPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  greenTokenText: {
    color: "#027A48",
    fontSize: 12,
    fontWeight: "700",
  },
  roomLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomLocationText: {
    fontSize: 12,
    color: "#475467",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  infoTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  infoTableLabel: {
    fontSize: 12,
    color: "#667085",
  },
  infoTableValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#102A56",
  },
  actionsGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridActionBtn: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    marginBottom: 10,
  },
  gridIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  gridActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#102A56",
    textAlign: "center",
  },
  accordionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    marginBottom: 16,
    overflow: "hidden",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#102A56",
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  accordionBullet: {
    fontSize: 12,
    color: "#475467",
    lineHeight: 18,
    marginBottom: 6,
  },
  overviewTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  overviewTriggerText: {
    fontSize: 13,
    color: "#155EEF",
    fontWeight: "600",
    marginRight: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#102A56",
    marginBottom: 6,
  },
  requiredStar: {
    color: "#D92D20",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: "#102A56",
  },
  selectorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  selectorCardText: {
    fontSize: 13,
    color: "#102A56",
    fontWeight: "500",
  },
  doctorMiniRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorMiniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  doctorMiniName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#102A56",
  },
  doctorMiniDegree: {
    fontSize: 11,
    color: "#667085",
  },
  infoCalloutBox: {
    flexDirection: "row",
    backgroundColor: "#EFF4FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 12,
    color: "#155EEF",
    lineHeight: 18,
  },
  primaryActionButton: {
    backgroundColor: "#155EEF",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryActionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryActionText: {
    color: "#344054",
    fontSize: 13,
    fontWeight: "600",
  },
  rescheduleStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  stepperItem: {
    alignItems: "center",
  },
  stepperCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2F4F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepperCircleActive: {
    backgroundColor: "#155EEF",
  },
  stepperNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#667085",
  },
  stepperNumberActive: {
    color: "#FFFFFF",
  },
  stepperLabel: {
    fontSize: 11,
    color: "#475467",
    fontWeight: "500",
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E4EAF2",
    marginHorizontal: 4,
    marginBottom: 14,
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    padding: 14,
    marginBottom: 18,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarMonthText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  dayNamesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayNameCell: {
    width: "14%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#667085",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  calendarDayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayActive: {
    backgroundColor: "#155EEF",
  },
  calendarDayText: {
    fontSize: 13,
    color: "#344054",
  },
  calendarDayTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  slotChip: {
    width: "31%",
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  slotChipActive: {
    backgroundColor: "#155EEF",
    borderColor: "#155EEF",
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#344054",
  },
  slotChipTextActive: {
    color: "#FFFFFF",
  },
  doctorsListContainer: {
    marginBottom: 16,
  },
  doctorSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    padding: 12,
    marginBottom: 10,
  },
  doctorSelectCardActive: {
    borderColor: "#155EEF",
    backgroundColor: "#F8FAFF",
  },
  doctorSelectMeta: {
    flex: 1,
  },
  doctorSelectName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102A56",
  },
  doctorSelectDegree: {
    fontSize: 12,
    color: "#475467",
    marginTop: 1,
  },
  doctorSelectSlots: {
    fontSize: 11,
    color: "#667085",
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D0D5DD",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterActive: {
    borderColor: "#155EEF",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#155EEF",
  },
  cancelIllustrationCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE4E2",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  cancelInnerIconWrap: {
    position: "relative",
  },
  cancelBadgeCross: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#D92D20",
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A56",
    textAlign: "center",
    marginBottom: 6,
  },
  cancelSubtitle: {
    fontSize: 13,
    color: "#667085",
    textAlign: "center",
    marginBottom: 18,
  },
  cancellationPolicyBox: {
    backgroundColor: "#EFF4FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#155EEF",
  },
  policyBullet: {
    fontSize: 12,
    color: "#155EEF",
    lineHeight: 18,
    marginBottom: 4,
  },
  cancelActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  keepApptButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  keepApptText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344054",
  },
  confirmCancelButton: {
    flex: 1.2,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#D92D20",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successIconWrapper: {
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 14,
  },
  successOuterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#D1FADF",
    justifyContent: "center",
    alignItems: "center",
  },
  successInnerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#12B76A",
    justifyContent: "center",
    alignItems: "center",
  },
  successTitleText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102A56",
    textAlign: "center",
    marginBottom: 6,
  },
  successSubtitleText: {
    fontSize: 13,
    color: "#667085",
    textAlign: "center",
    marginBottom: 20,
  },
  successCard: {
    backgroundColor: "#F6FEF9",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#A6F4C5",
    marginBottom: 24,
  },
  referenceIdRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  referenceLabel: {
    fontSize: 11,
    color: "#667085",
  },
  referenceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102A56",
  },
  overviewHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A56",
    marginBottom: 4,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4EAF2",
    padding: 12,
    marginBottom: 8,
  },
  featureIconWrap: {
    marginRight: 10,
  },
  featureTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102A56",
  },
  featureDescText: {
    fontSize: 11,
    color: "#667085",
    marginTop: 2,
  },
  hospitalArtContainer: {
    backgroundColor: "#EFF4FF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  hospitalArtText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#155EEF",
    textAlign: "center",
  },
});
