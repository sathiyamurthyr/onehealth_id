/**
 * ONEHEALTH ID (OH-ID) Mobile — Document Upload Multi-Stage Progress (Concept 7)
 * Sathus Technology Pvt Ltd
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { CheckCircle2, FileText } from "lucide-react-native";
import { ohidTheme } from "../../theme";

export interface UploadStage {
  id: string;
  label: string;
  status: "pending" | "active" | "completed";
}

export interface UploadProgressStepsProps {
  fileName: string;
  fileSizeStr?: string;
  percentage?: number;
  stages: UploadStage[];
  testID?: string;
}

export const UploadProgressSteps: React.FC<UploadProgressStepsProps> = ({
  fileName,
  fileSizeStr = "12.4 MB",
  percentage = 66,
  stages,
  testID = "upload-progress-steps",
}) => {
  return (
    <View style={styles.card} testID={testID}>
      {/* File Info Bar */}
      <View style={styles.fileRow}>
        <View style={styles.fileIconBox}>
          <FileText size={20} color="#DC2626" />
        </View>
        <View style={styles.fileMeta}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={styles.fileSize}>{fileSizeStr}</Text>
        </View>
      </View>

      {/* Progress Label & Percentage */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Uploading...</Text>
        <Text style={styles.progressPercent}>{Math.round(percentage)}%</Text>
      </View>

      {/* Progress Bar Track */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${Math.min(100, Math.max(0, percentage))}%` }]} />
      </View>

      {/* 4 Stages List */}
      <View style={styles.stagesList}>
        {stages.map((stage) => {
          return (
            <View key={stage.id} style={styles.stageItem}>
              {stage.status === "completed" ? (
                <CheckCircle2 size={18} color={ohidTheme.colors.success} style={styles.stageIcon} />
              ) : stage.status === "active" ? (
                <ActivityIndicator
                  size="small"
                  color={ohidTheme.colors.primary}
                  style={styles.stageIcon}
                />
              ) : (
                <View style={styles.pendingCircle} />
              )}
              <Text
                style={[
                  styles.stageText,
                  stage.status === "active" && styles.stageTextActive,
                  stage.status === "completed" && styles.stageTextCompleted,
                ]}
              >
                {stage.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: ohidTheme.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: ohidTheme.colors.border,
    marginBottom: 16,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: ohidTheme.colors.border,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: ohidTheme.colors.textPrimary,
  },
  fileSize: {
    fontSize: 11,
    color: ohidTheme.colors.textSecondary,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: ohidTheme.colors.textPrimary,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "700",
    color: ohidTheme.colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 18,
  },
  progressBar: {
    height: "100%",
    backgroundColor: ohidTheme.colors.primary,
    borderRadius: 3,
  },
  stagesList: {
    gap: 12,
  },
  stageItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stageIcon: {
    marginRight: 10,
    width: 20,
    alignItems: "center",
  },
  pendingCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    marginRight: 13,
    marginLeft: 3,
  },
  stageText: {
    fontSize: 13,
    color: ohidTheme.colors.textSecondary,
    fontWeight: "500",
  },
  stageTextActive: {
    color: ohidTheme.colors.primary,
    fontWeight: "600",
  },
  stageTextCompleted: {
    color: ohidTheme.colors.textPrimary,
  },
});

