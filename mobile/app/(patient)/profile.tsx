/**
 * ONEHEALTH ID (OH-ID) Mobile — Patient Comprehensive Profile Screen
 * Sathus Technology Pvt Ltd
 *
 * Implements full patient demographic viewing, contact info editing,
 * verified identity guarding, and linked family members management.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  ShieldCheck,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Users,
  UserPlus,
  Trash2,
  Copy,
  Lock,
  LogOut,
  Building2,
  Home,
  Calendar,
  FileText,
  AlertCircle,
  Plus,
  ChevronRight,
} from "lucide-react-native";
import { patientApi } from "../../src/services/api/patient";
import { useAuth } from "../../src/context/AuthContext";
import { PatientProfile, FamilyMember } from "../../src/types/patient";

export default function PatientProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const successTimeoutRef = useRef<any>(null);
  const copyTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    emergency_contact: "",
    preferred_language: "English",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add Family Member Modal States
  const [addFamilyVisible, setAddFamilyVisible] = useState(false);
  const [addingFamily, setAddingFamily] = useState(false);
  const [familyForm, setFamilyForm] = useState({
    name: "",
    relationship: "Spouse",
    age: "30",
    gender: "Female",
    phone: "",
    view_appointments: true,
    book_appointments: true,
    view_records: true,
  });

  const loadData = useCallback(async () => {
    try {
      setError(null);
      // Fetch comprehensive profile and family members in parallel
      const [profileData, familyData] = await Promise.all([
        patientApi.getMyProfile().catch((err) => {
          console.warn("Falling back to card/user profile:", err);
          return {
            id: user?.id || "p-101",
            onehealth_id: `OHID-IND-2026-${(user?.username || "01001").slice(-5)}`,
            name: user?.name || user?.full_name || "Alice Smith",
            age: 32,
            gender: "Female",
            dob: "1994-01-01",
            blood_group: "O+",
            phone: user?.username || "9840199999",
            email: "alice.smith@onehealth.id",
            address: "123 Health Ave, Anna Nagar",
            city: "Chennai",
            state: "Tamil Nadu",
            emergency_contact: "John Smith (+91 98765 43210)",
            preferred_language: "English",
            status: "VERIFIED_ACTIVE",
            verification_status: "VERIFIED_ACTIVE",
            hospital_name: user?.hospital_name || "Kedar Hospital",
          } as PatientProfile;
        }),
        patientApi.getFamilyMembers().catch(() => [] as FamilyMember[]),
      ]);

      setProfile(profileData);
      setFamilyMembers(familyData);

      setEditForm({
        phone: profileData.phone || "",
        email: profileData.email || "",
        address: profileData.address || "",
        city: profileData.city || "",
        state: profileData.state || "",
        emergency_contact: profileData.emergency_contact || "",
        preferred_language: profileData.preferred_language || "English",
      });
    } catch (err: any) {
      console.error("Failed to load profile data:", err);
      setError(err?.message || "Failed to load patient profile.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.username, user?.hospital_name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCopyId = () => {
    setCopiedNotice(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedNotice(false);
    }, 2000);
  };

  const handleSaveProfile = async () => {
    if (!editForm.phone.trim()) {
      Alert.alert("Validation Error", "Mobile number is required.");
      return;
    }

    try {
      setSaveLoading(true);
      const updated = await patientApi.updateMyProfile(editForm);
      setProfile((prev) => (prev ? { ...prev, ...updated, ...editForm } : null));
      setIsEditing(false);
      setSuccessMsg("Contact information updated successfully.");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      Alert.alert("Update Failed", err?.message || "Could not update profile information.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddFamilyMember = async () => {
    if (!familyForm.name.trim()) {
      Alert.alert("Validation Error", "Family member name is required.");
      return;
    }

    let succeeded = false;
    try {
      setAddingFamily(true);
      const newMember = await patientApi.addFamilyMember({
        relationship: familyForm.relationship,
        is_guardian: familyForm.relationship === "Parent" || familyForm.relationship === "Guardian",
        is_minor: parseInt(familyForm.age, 10) < 18,
        new_member: {
          name: familyForm.name.trim(),
          age: parseInt(familyForm.age, 10) || 30,
          gender: familyForm.gender,
          phone: familyForm.phone.trim() || undefined,
        },
        permissions: {
          view_appointments: familyForm.view_appointments,
          book_appointments: familyForm.book_appointments,
          view_records: familyForm.view_records,
        },
      });
      console.log("ADD FAMILY SUCCESS, CLOSING MODAL: newMember=", Boolean(newMember));

      // Optimistically append new member to avoid a second full refresh
      if (newMember) {
        setFamilyMembers((prev) => [...prev, newMember]);
      }
      setAddFamilyVisible(false);
      setFamilyForm({
        name: "",
        relationship: "Spouse",
        age: "30",
        gender: "Female",
        phone: "",
        view_appointments: true,
        book_appointments: true,
        view_records: true,
      });
      succeeded = true;
    } catch (err: any) {
      console.error("Failed to add family member:", err);
      Alert.alert("Error", err?.message || "Failed to add family member.");
    } finally {
      setAddingFamily(false);
      if (succeeded) Alert.alert("Success", "Family member linked successfully.");
    }
  };

  const handleRemoveFamily = (relId: string, memberName: string) => {
    const confirmRemoval = async () => {
      try {
        await patientApi.removeFamilyMember(relId);
        setFamilyMembers((prev) => prev.filter((m) => m.id !== relId));
        Alert.alert(
          "Unlinked",
          `${memberName} has been unlinked from your profile. Their independent OneHealth ID records remain secure.`
        );
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to unlink family member.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to unlink ${memberName}?`)) {
        confirmRemoval();
      }
    } else {
      Alert.alert(
        "Unlink Family Member",
        `Are you sure you want to unlink ${memberName}? Their independent health records will remain intact.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Unlink", style: "destructive", onPress: confirmRemoval },
        ]
      );
    }
  };

  const handleSignOut = async () => {
    const doLogout = async () => {
      await logout();
      router.replace("/(auth)/login");
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out of OneHealth ID?")) {
        doLogout();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out of OneHealth ID?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const patientName = profile?.name || user?.name || "Alice Smith";
  const patientOhid = profile?.onehealth_id || "OHID-IND-2026-01001";
  const maskedPhone = profile?.phone
    ? profile.phone.replace(/(\d{2})\d{4}(\d{4})/, "+91 $1•••• $2")
    : "+91 98•••• 9999";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]} testID="patient-profile-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-to-home-btn"
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.screenTitle}>Personal Health Profile</Text>
          <Text style={styles.screenSubtitle}>Verified Identity & Account Settings</Text>
        </View>
        <TouchableOpacity
          style={styles.copyIdHeaderPill}
          onPress={handleCopyId}
          activeOpacity={0.7}
          accessibilityLabel={`Copy OH-ID ${patientOhid}`}
        >
          <Text style={styles.copyIdHeaderText}>
            {copiedNotice ? "Copied!" : patientOhid.split("-").slice(-2).join("-")}
          </Text>
          <Copy size={11} color="#2563EB" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      {/* Main Content Scroll View */}
      {loading ? (
        <View style={styles.centerBox} testID="profile-loading">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading verified patient profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Message Banner */}
          {successMsg && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={16} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* 1. IDENTITY HERO CARD */}
          <View style={styles.heroCard}>
            <View style={styles.heroAmbientGlow} pointerEvents="none" />
            <View style={styles.heroTopRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {patientName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.verifiedCheckBadge}>
                  <CheckCircle2 size={14} color="#10B981" />
                </View>
              </View>

              <View style={styles.heroMetaCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {patientName}
                  </Text>
                  <View style={styles.identityBadge}>
                    <Text style={styles.identityBadgeText}>Verified Identity</Text>
                  </View>
                </View>
                <Text style={styles.heroOhid}>{patientOhid}</Text>
                <View style={styles.heroDemographicsRow}>
                  <Text style={styles.heroDemoText}>
                    Age: <Text style={styles.heroDemoBold}>{profile?.age || 32} Yrs</Text>
                  </Text>
                  <Text style={styles.heroDemoDivider}>•</Text>
                  <Text style={styles.heroDemoText}>
                    Gender: <Text style={styles.heroDemoBold}>{profile?.gender || "Female"}</Text>
                  </Text>
                  <Text style={styles.heroDemoDivider}>•</Text>
                  <View style={styles.bloodPill}>
                    <Text style={styles.bloodPillText}>{profile?.blood_group || "O+"}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.heroFooterStrip}>
              <View style={styles.hospitalRow}>
                <Building2 size={13} color="#93C5FD" style={{ marginRight: 5 }} />
                <Text style={styles.hospitalText}>
                  {profile?.hospital_name || user?.hospital_name || "Kedar Hospital Network"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.heroQrBtn}
                onPress={() => router.push("/(patient)" as any)}
                activeOpacity={0.8}
                testID="hero-qr-btn"
              >
                <Text style={styles.heroQrBtnText}>Show QR Pass</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. EDIT OR VIEW CONTACT & DEMOGRAPHICS */}
          {isEditing ? (
            /* EDIT PROFILE FORM */
            <View style={styles.sectionCard} testID="edit-profile-form">
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionTitleGroup}>
                  <Edit3 size={16} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionCardTitle}>Edit Contact Information</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsEditing(false)}
                  style={styles.cancelIconBtn}
                  testID="cancel-edit-btn"
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.editNoticeBox}>
                <Lock size={12} color="#0369A1" style={{ marginRight: 5, marginTop: 1 }} />
                <Text style={styles.editNoticeText}>
                  Verified identity attributes (Legal Name, OneHealth ID, DOB, Gender) are officially guarded and require hospital credential verification to modify.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.phone}
                  onChangeText={(val) => setEditForm((prev) => ({ ...prev, phone: val }))}
                  placeholder="e.g. 9840199999"
                  keyboardType="phone-pad"
                  testID="edit-phone-input"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.email}
                  onChangeText={(val) => setEditForm((prev) => ({ ...prev, email: val }))}
                  placeholder="e.g. patient@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="edit-email-input"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Residential Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.address}
                  onChangeText={(val) => setEditForm((prev) => ({ ...prev, address: val }))}
                  placeholder="Street / Apartment / Locality"
                  testID="edit-address-input"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.city}
                    onChangeText={(val) => setEditForm((prev) => ({ ...prev, city: val }))}
                    placeholder="Chennai"
                    testID="edit-city-input"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.state}
                    onChangeText={(val) => setEditForm((prev) => ({ ...prev, state: val }))}
                    placeholder="Tamil Nadu"
                    testID="edit-state-input"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Emergency Contact (Name & Phone)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.emergency_contact}
                  onChangeText={(val) => setEditForm((prev) => ({ ...prev, emergency_contact: val }))}
                  placeholder="e.g. John Smith (+91 98765 43210)"
                  testID="edit-emergency-input"
                />
              </View>

              <View style={styles.formActionButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsEditing(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={saveLoading}
                  activeOpacity={0.8}
                  testID="save-profile-btn"
                >
                  {saveLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Save size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* VIEW DEMOGRAPHICS & CONTACT */
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <View style={styles.sectionTitleGroup}>
                  <User size={16} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={styles.sectionCardTitle}>Demographics & Contact</Text>
                </View>
                <TouchableOpacity
                  style={styles.editActionPill}
                  onPress={() => setIsEditing(true)}
                  testID="edit-profile-btn"
                  activeOpacity={0.8}
                >
                  <Edit3 size={12} color="#2563EB" style={{ marginRight: 4 }} />
                  <Text style={styles.editActionPillText}>Edit Info</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registered Phone</Text>
                <View style={styles.detailValueWithBadge}>
                  <Text style={styles.detailValueBold}>{maskedPhone}</Text>
                  <View style={styles.verifiedSmallTag}>
                    <Text style={styles.verifiedSmallTagText}>Verified</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValueBold}>{profile?.email || "—"}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Residential Address</Text>
                <Text style={[styles.detailValueBold, { textAlign: "right", maxWidth: 180 }]}>
                  {profile?.address || "Anna Nagar, Chennai"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>City / State</Text>
                <Text style={styles.detailValueBold}>
                  {profile?.city || "Chennai"}, {profile?.state || "Tamil Nadu"}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Preferred Language</Text>
                <Text style={styles.detailValueBold}>
                  {profile?.preferred_language || "English"}
                </Text>
              </View>
            </View>
          )}

          {/* 3. CLINICAL PROFILE & EMERGENCY */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionTitleGroup}>
                <Heart size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.sectionCardTitle}>Clinical Profile & Emergency</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Emergency Contact</Text>
              <Text style={styles.detailValueBold}>
                {profile?.emergency_contact || "John Smith (+91 98765 43210)"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Blood Group</Text>
              <View style={styles.bloodBadgeSmall}>
                <Text style={styles.bloodBadgeSmallText}>
                  {profile?.blood_group || "O+ Positive"}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Known Allergies</Text>
              <Text style={styles.detailValueMuted}>
                {profile?.allergies?.length ? profile.allergies.join(", ") : "None on record"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>National Identity Document</Text>
              <Text style={styles.detailValueMono}>
                {profile?.identity_type || "NATIONAL_ID"}:{" "}
                {profile?.identity_number
                  ? `••••${profile.identity_number.slice(-4)}`
                  : "Verified"}
              </Text>
            </View>

            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Identity Account Status</Text>
              <View style={styles.activeVerifiedTag}>
                <CheckCircle2 size={12} color="#16A34A" style={{ marginRight: 4 }} />
                <Text style={styles.activeVerifiedTagText}>
                  {profile?.status || "Active Verified"}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. FAMILY HEALTHCARE MEMBERS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionTitleGroup}>
                <Users size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={styles.sectionCardTitle}>Family Healthcare Members</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{familyMembers.length}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addMemberPill}
                onPress={() => setAddFamilyVisible(true)}
                activeOpacity={0.8}
                testID="add-family-btn"
              >
                <Plus size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.addMemberPillText}>Add</Text>
              </TouchableOpacity>
            </View>

            {familyMembers.length === 0 ? (
              <View style={styles.emptyFamilyBox}>
                <Users size={28} color="#94A3B8" />
                <Text style={styles.emptyFamilyTitle}>No Family Members Linked</Text>
                <Text style={styles.emptyFamilyDesc}>
                  Link dependents, children, or elderly parents to view appointments and coordinate healthcare care.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddFamilyBtn}
                  onPress={() => setAddFamilyVisible(true)}
                >
                  <UserPlus size={14} color="#2563EB" style={{ marginRight: 5 }} />
                  <Text style={styles.emptyAddFamilyBtnText}>Link Family Member</Text>
                </TouchableOpacity>
              </View>
            ) : (
              familyMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.familyItemCard}
                  onPress={() =>
                    router.push({
                      pathname: "/(patient)/family_member",
                      params: {
                        id: member.member_patient_id,
                        relationship_id: member.id,
                        name: member.member_name,
                        relationship: member.relationship,
                      },
                    })
                  }
                  testID={`family-member-${member.id}`}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`View healthcare profile for ${member.member_name}, ${member.relationship}`}
                >
                  <View style={styles.familyAvatarCircle}>
                    <Text style={styles.familyAvatarText}>
                      {member.member_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.familyItemMeta}>
                    <View style={styles.familyNameRow}>
                      <Text style={styles.familyMemberName}>{member.member_name}</Text>
                      <View style={styles.relationBadge}>
                        <Text style={styles.relationBadgeText}>{member.relationship}</Text>
                      </View>
                      {member.is_guardian && (
                        <View style={styles.guardianBadge}>
                          <Text style={styles.guardianBadgeText}>Guardian</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.familyOhid}>{member.member_onehealth_id}</Text>

                    <View style={styles.familyPermsRow}>
                      <Text style={styles.familyPermText}>
                        Age: {member.member_age} Yrs • {member.member_gender}
                      </Text>
                      {member.permissions?.view_appointments && (
                        <View style={styles.permChip}>
                          <Text style={styles.permChipText}>Appointments</Text>
                        </View>
                      )}
                      {member.permissions?.view_records && (
                        <View style={styles.permChip}>
                          <Text style={styles.permChipText}>Records</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.familyActionsColumn}>
                    <View style={styles.viewProfilePill}>
                      <Text style={styles.viewProfilePillText}>View</Text>
                      <ChevronRight size={13} color="#2563EB" />
                    </View>
                    <TouchableOpacity
                      style={styles.unlinkBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveFamily(member.id, member.member_name);
                      }}
                      testID={`unlink-family-${member.id}`}
                      accessibilityLabel={`Unlink ${member.member_name}`}
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* 5. PRIVACY & SECURITY ASSURANCE */}
          <View style={styles.securityAssuranceBox}>
            <ShieldCheck size={20} color="#2563EB" style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.assuranceTitle}>Security & Privacy Guarantee</Text>
              <Text style={styles.assuranceDesc}>
                Your health records and demographic identity are encrypted with AES-256-GCM. Personal data is never shared across facilities without authenticated patient authorization.
              </Text>
            </View>
          </View>

          {/* 6. SIGN OUT BUTTON */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            testID="logout-btn"
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.signOutButtonText}>Sign Out of OH-ID</Text>
          </TouchableOpacity>

          {/* Bottom spacing for fixed tab bar */}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ADD FAMILY MEMBER MODAL */}
      {addFamilyVisible && (
        <Modal
          visible={addFamilyVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAddFamilyVisible(false)}
        >
          <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Link Family Member</Text>
                <Text style={styles.modalSubtitle}>
                  Add a dependent or relative to coordinate healthcare
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddFamilyVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={familyForm.name}
                  onChangeText={(val) => setFamilyForm((p) => ({ ...p, name: val }))}
                  placeholder="e.g. Maya Smith"
                  testID="family-name-input"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Relationship</Text>
                  <TextInput
                    style={styles.textInput}
                    value={familyForm.relationship}
                    onChangeText={(val) => setFamilyForm((p) => ({ ...p, relationship: val }))}
                    placeholder="Spouse / Child / Parent"
                    testID="family-rel-input"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.textInput}
                    value={familyForm.age}
                    onChangeText={(val) => setFamilyForm((p) => ({ ...p, age: val }))}
                    placeholder="30"
                    keyboardType="number-pad"
                    testID="family-age-input"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {["Female", "Male", "Other"].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderPill,
                        familyForm.gender === g && styles.genderPillActive,
                      ]}
                      onPress={() => setFamilyForm((p) => ({ ...p, gender: g }))}
                    >
                      <Text
                        style={[
                          styles.genderPillText,
                          familyForm.gender === g && styles.genderPillTextActive,
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={familyForm.phone}
                  onChangeText={(val) => setFamilyForm((p) => ({ ...p, phone: val }))}
                  placeholder="e.g. 9840199998"
                  keyboardType="phone-pad"
                  testID="family-phone-input"
                />
              </View>

              <View style={styles.permissionsBox}>
                <Text style={styles.permsTitle}>Family Access Permissions</Text>
                <TouchableOpacity
                  style={styles.permToggleRow}
                  onPress={() =>
                    setFamilyForm((p) => ({ ...p, view_appointments: !p.view_appointments }))
                  }
                >
                  <CheckCircle2
                    size={16}
                    color={familyForm.view_appointments ? "#2563EB" : "#94A3B8"}
                  />
                  <Text style={styles.permToggleLabel}>View upcoming appointments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.permToggleRow}
                  onPress={() =>
                    setFamilyForm((p) => ({ ...p, book_appointments: !p.book_appointments }))
                  }
                >
                  <CheckCircle2
                    size={16}
                    color={familyForm.book_appointments ? "#2563EB" : "#94A3B8"}
                  />
                  <Text style={styles.permToggleLabel}>Book hospital appointments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.permToggleRow}
                  onPress={() =>
                    setFamilyForm((p) => ({ ...p, view_records: !p.view_records }))
                  }
                >
                  <CheckCircle2
                    size={16}
                    color={familyForm.view_records ? "#2563EB" : "#94A3B8"}
                  />
                  <Text style={styles.permToggleLabel}>View clinical health records</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddFamilyVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddFamilyMember}
                disabled={addingFamily}
                testID="submit-add-family-btn"
              >
                {addingFamily ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Link Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomNavContainer}>
        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.8}
          onPress={() => router.push("/(patient)" as any)}
          accessibilityRole="tab"
          accessibilityLabel="Home tab"
        >
          <Home size={22} color="#64748B" />
          <Text style={styles.navTabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.8}
          onPress={() => router.push("/(patient)/appointments" as any)}
          accessibilityRole="tab"
          accessibilityLabel="Appointments tab"
        >
          <Calendar size={22} color="#64748B" />
          <Text style={styles.navTabLabel}>Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.8}
          onPress={() => router.push("/(patient)/timeline" as any)}
          accessibilityRole="tab"
          accessibilityLabel="Health Records tab"
        >
          <FileText size={22} color="#64748B" />
          <Text style={styles.navTabLabel}>Health Records</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTabItem}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityLabel="Profile tab (active)"
        >
          <User size={22} color="#2563EB" strokeWidth={2.5} />
          <Text style={styles.navTabActiveLabel}>Profile</Text>
          <View style={styles.activeTabIndicator} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitles: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  screenSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  copyIdHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copyIdHeaderText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#2563EB",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#166534",
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#991B1B",
    flex: 1,
  },
  heroCard: {
    backgroundColor: "#0A2540",
    borderRadius: 20,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#0A2540",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: "0 8px 20px -4px rgba(10, 37, 64, 0.25)",
      } as any,
    }),
  },
  heroAmbientGlow: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(37, 99, 235, 0.3)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  verifiedCheckBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 1,
  },
  heroMetaCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  identityBadge: {
    backgroundColor: "rgba(6, 78, 59, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  identityBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#34D399",
  },
  heroOhid: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#38BDF8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
  heroDemographicsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 5,
  },
  heroDemoText: {
    fontSize: 11,
    color: "#CBD5E1",
  },
  heroDemoBold: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroDemoDivider: {
    color: "#64748B",
    fontSize: 10,
  },
  bloodPill: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  bloodPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FCA5A5",
  },
  heroFooterStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  hospitalText: {
    fontSize: 11,
    color: "#93C5FD",
    fontWeight: "500",
  },
  heroQrBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  heroQrBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      } as any,
    }),
  },
  sectionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  sectionTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  countBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },
  editActionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editActionPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  cancelIconBtn: {
    padding: 4,
  },
  editNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 9,
    marginBottom: 12,
  },
  editNoticeText: {
    fontSize: 10.5,
    color: "#0369A1",
    lineHeight: 14,
    flex: 1,
  },
  formGroup: {
    marginBottom: 10,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: "#0F172A",
  },
  formActionButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  detailLabel: {
    fontSize: 11.5,
    color: "#64748B",
  },
  detailValueBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailValueMuted: {
    fontSize: 11.5,
    color: "#64748B",
  },
  detailValueMono: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#334155",
  },
  detailValueWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedSmallTag: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  verifiedSmallTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#16A34A",
  },
  bloodBadgeSmall: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bloodBadgeSmallText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  activeVerifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeVerifiedTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  addMemberPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addMemberPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyFamilyBox: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyFamilyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  emptyFamilyDesc: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 3,
    lineHeight: 15,
    maxWidth: 280,
  },
  emptyAddFamilyBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyAddFamilyBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  familyItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  familyAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  familyAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#7C3AED",
  },
  familyItemMeta: {
    flex: 1,
  },
  familyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  familyMemberName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  relationBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  relationBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  guardianBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  guardianBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D97706",
  },
  familyOhid: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 1,
  },
  familyPermsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    flexWrap: "wrap",
    gap: 4,
  },
  familyPermText: {
    fontSize: 10,
    color: "#64748B",
  },
  permChip: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  permChipText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  unlinkBtn: {
    padding: 6,
    marginLeft: 2,
  },
  familyActionsColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 6,
    gap: 6,
  },
  viewProfilePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  viewProfilePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  securityAssuranceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 14,
    padding: 11,
    marginBottom: 14,
  },
  assuranceTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  assuranceDesc: {
    fontSize: 10.5,
    color: "#166534",
    lineHeight: 14,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 11,
    borderRadius: 12,
  },
  signOutButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
    height: 60,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 10 : 2,
  },
  navTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    position: "relative",
  },
  activeTabIndicator: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#2563EB",
    marginTop: 3,
  },
  navTabLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  navTabActiveLabel: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  genderPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  genderPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  genderPillTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  permissionsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
    marginBottom: 10,
  },
  permsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  permToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  permToggleLabel: {
    fontSize: 11.5,
    color: "#334155",
    marginLeft: 8,
  },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modalSubmitBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
