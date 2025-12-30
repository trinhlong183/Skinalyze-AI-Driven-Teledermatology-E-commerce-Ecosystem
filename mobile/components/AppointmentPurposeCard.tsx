import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { AppointmentType } from "@/types/appointment.type";
import { TreatmentRoutine } from "@/types/treatment-routine.type";
import { router } from "expo-router";
import { SkinAnalysisResult } from "@/services/skinAnalysisService";

const fallbackLocale = "en-US";

const formatDate = (isoDate: string, locale: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleDateString(locale || fallbackLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

type Props = {
  appointmentType: AppointmentType;
  setAppointmentType: (type: AppointmentType) => void;

  analyses: SkinAnalysisResult[];
  selectedAnalysisId: string | null;
  setSelectedAnalysisId: (id: string | null) => void;

  routines: TreatmentRoutine[];
  selectedRoutineId: string | null;
  setSelectedRoutineId: (id: string | null) => void;

  note: string;
  setNote: (note: string) => void;
};

export default function AppointmentPurposeCard({
  appointmentType,
  setAppointmentType,
  analyses,
  selectedAnalysisId,
  setSelectedAnalysisId,
  routines,
  selectedRoutineId,
  setSelectedRoutineId,
  note,
  setNote,
}: Props) {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "bookingConfirmation.purposeCard",
  });
  const locale = useMemo(
    () => i18n.language || fallbackLocale,
    [i18n.language]
  );

  const [isAnalysisModalVisible, setIsAnalysisModalVisible] = useState(false);
  const [isRoutineModalVisible, setIsRoutineModalVisible] = useState(false);

  useEffect(() => {
    if (analyses.length && !selectedAnalysisId) {
      setSelectedAnalysisId(analyses[0].analysisId);
    }
  }, [analyses, selectedAnalysisId, setSelectedAnalysisId]);

  useEffect(() => {
    if (routines.length && !selectedRoutineId) {
      setSelectedRoutineId(routines[0].routineId);
    }
  }, [routines, selectedRoutineId, setSelectedRoutineId]);

  const selectedAnalysis = useMemo(() => {
    if (!analyses.length) return null;
    if (selectedAnalysisId) {
      const found = analyses.find(
        (analysis) => analysis.analysisId === selectedAnalysisId
      );
      if (found) return found;
    }
    return analyses[0];
  }, [analyses, selectedAnalysisId]);

  const renderAnalysisOption = ({ item }: { item: SkinAnalysisResult }) => {
    const isSelected = selectedAnalysisId === item.analysisId;
    const isManual = item.source === "MANUAL";
    const headline =
      item.chiefComplaint ||
      item.aiDetectedDisease ||
      item.aiDetectedCondition ||
      t("fallbackAnalysis");
    const meta = `${formatDate(item.createdAt, locale)} · ${
      isManual ? t("selfReported") : t("aiAssessment")
    }`;

    return (
      <Pressable
        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
        onPress={() => {
          setSelectedAnalysisId(item.analysisId);
          setIsAnalysisModalVisible(false);
        }}
      >
        <View style={styles.modalItemRow}>
          <MaterialCommunityIcons
            name={isManual ? "file-document-edit" : "robot-excited"}
            size={20}
            color={isManual ? "#1b5e20" : "#1a237e"}
          />
          <View style={styles.modalItemTextBlock}>
            <Text style={styles.modalItemTitle} numberOfLines={1}>
              {headline}
            </Text>
            <Text style={styles.modalItemMeta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          <View
            style={[
              styles.analysisBadge,
              isManual ? styles.manualBadge : styles.aiBadge,
            ]}
          >
            <Text style={styles.analysisBadgeText}>
              {isManual ? t("manualTag") : t("aiTag")}
            </Text>
          </View>
        </View>
        {isSelected && (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="#007bff"
            style={styles.modalItemCheck}
          />
        )}
      </Pressable>
    );
  };

  const renderRoutineOption = ({ item }: { item: TreatmentRoutine }) => {
    const isSelected = selectedRoutineId === item.routineId;

    return (
      <Pressable
        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
        onPress={() => {
          setSelectedRoutineId(item.routineId);
          setIsRoutineModalVisible(false);
        }}
      >
        <View style={styles.modalItemRow}>
          <MaterialCommunityIcons
            name="clipboard-text"
            size={20}
            color="#512da8"
          />
          <View style={styles.modalItemTextBlock}>
            <Text style={styles.modalItemTitle} numberOfLines={1}>
              {item.routineName || t("fallbackRoutine")}
            </Text>
            <Text style={styles.modalItemMeta} numberOfLines={1}>
              {formatDate(item.createdAt, locale)}
            </Text>
          </View>
        </View>
        {isSelected && (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="#007bff"
            style={styles.modalItemCheck}
          />
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("title")}</Text>

      {/* 1. Chọn Type (NEW_PROBLEM / FOLLOW_UP) */}
      <View style={styles.segmentedControl}>
        <Pressable
          style={[
            styles.segmentButton,
            appointmentType === AppointmentType.NEW_PROBLEM &&
              styles.segmentButtonActive,
          ]}
          onPress={() => setAppointmentType(AppointmentType.NEW_PROBLEM)}
        >
          <Text
            style={
              appointmentType === AppointmentType.NEW_PROBLEM
                ? styles.segmentTextActive
                : styles.segmentText
            }
          >
            {t("newProblem")}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segmentButton,
            appointmentType === AppointmentType.FOLLOW_UP &&
              styles.segmentButtonActive,
          ]}
          onPress={() => setAppointmentType(AppointmentType.FOLLOW_UP)}
        >
          <Text
            style={
              appointmentType === AppointmentType.FOLLOW_UP
                ? styles.segmentTextActive
                : styles.segmentText
            }
          >
            {t("followUp")}
          </Text>
        </Pressable>
      </View>

      {/* === Analysis picker (always shown) === */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>{t("analysisLabel")}</Text>
        <Pressable
          style={styles.createAnalysisLink}
          onPress={() => router.push("/(stacks)/ManualSkinAnalysisScreen")}
        >
          <Text style={styles.createAnalysisText}>
            {t("createManualEntry")}
          </Text>
        </Pressable>
        {analyses.length === 0 ? (
          <View style={styles.analysisEmptyState}>
            <MaterialCommunityIcons
              name="file-search"
              size={22}
              color="#9e9e9e"
            />
            <Text style={styles.analysisEmptyText}>{t("noAnalysis")}</Text>
          </View>
        ) : (
          <View style={styles.analysisContainer}>
            <Pressable
              style={styles.analysisPreview}
              onPress={() => setIsAnalysisModalVisible(true)}
            >
              {selectedAnalysis ? (
                <>
                  <View style={styles.analysisRow}>
                    <MaterialCommunityIcons
                      name={
                        selectedAnalysis.source === "MANUAL"
                          ? "file-document-edit"
                          : "robot-excited"
                      }
                      size={20}
                      color={
                        selectedAnalysis.source === "MANUAL"
                          ? "#1b5e20"
                          : "#1a237e"
                      }
                      style={styles.analysisIcon}
                    />
                    <View style={styles.analysisTextBlock}>
                      <Text style={styles.analysisTitle} numberOfLines={1}>
                        {selectedAnalysis.chiefComplaint ||
                          selectedAnalysis.aiDetectedDisease ||
                          selectedAnalysis.aiDetectedCondition ||
                          t("fallbackAnalysis")}
                      </Text>
                      <Text style={styles.analysisMeta} numberOfLines={1}>
                        {`${formatDate(selectedAnalysis.createdAt, locale)} · ${
                          selectedAnalysis.source === "MANUAL"
                            ? t("selfReported")
                            : t("aiAssessment")
                        }`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.analysisBadge,
                        selectedAnalysis.source === "MANUAL"
                          ? styles.manualBadge
                          : styles.aiBadge,
                      ]}
                    >
                      <Text style={styles.analysisBadgeText}>
                        {selectedAnalysis.source === "MANUAL"
                          ? t("manualTag")
                          : t("aiTag")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.previewFooter}>
                    <Text style={styles.previewHint}>
                      {t("chooseAnotherAnalysis")}
                    </Text>
                    <MaterialCommunityIcons
                      name="menu-down"
                      size={20}
                      color="#007bff"
                    />
                  </View>
                </>
              ) : null}
            </Pressable>
            {!selectedAnalysis && (
              <Pressable
                style={styles.modalTrigger}
                onPress={() => setIsAnalysisModalVisible(true)}
              >
                <MaterialCommunityIcons
                  name="menu-down"
                  size={20}
                  color="#007bff"
                />
                <Text style={styles.modalTriggerText}>
                  {t("chooseAnalysis")}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* === Routine picker if FOLLOW_UP === */}
      {appointmentType === AppointmentType.FOLLOW_UP && (
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>{t("routineLabel")}</Text>
          {routines.length === 0 ? (
            <View style={styles.analysisEmptyState}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={20}
                color="#9e9e9e"
              />
              <Text style={styles.analysisEmptyText}>{t("noRoutine")}</Text>
            </View>
          ) : (
            <Pressable
              style={styles.modalTrigger}
              onPress={() => setIsRoutineModalVisible(true)}
            >
              <MaterialCommunityIcons
                name="clipboard-text"
                size={20}
                color="#512da8"
              />
              <Text style={styles.modalTriggerText}>
                {routines.find((r) => r.routineId === selectedRoutineId)
                  ?.routineName || t("chooseRoutine")}
              </Text>
              <MaterialCommunityIcons
                name="menu-down"
                size={20}
                color="#512da8"
              />
            </Pressable>
          )}
        </View>
      )}

      {/* 3. Add Note  */}
      <View style={styles.noteContainer}>
        <Text style={styles.label}>{t("noteLabel")}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t("notePlaceholder")}
          value={note}
          onChangeText={setNote}
          multiline
        />
      </View>
      <Modal
        visible={isAnalysisModalVisible}
        animationType="slide"
        onRequestClose={() => setIsAnalysisModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("selectAnalysisTitle")}</Text>
            <Pressable onPress={() => setIsAnalysisModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#444" />
            </Pressable>
          </View>
          <FlatList
            data={analyses}
            keyExtractor={(item) => item.analysisId}
            renderItem={renderAnalysisOption}
            ItemSeparatorComponent={() => (
              <View style={styles.modalSeparator} />
            )}
            contentContainerStyle={styles.modalListContent}
          />
        </View>
      </Modal>

      <Modal
        visible={isRoutineModalVisible}
        animationType="slide"
        onRequestClose={() => setIsRoutineModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("selectRoutineTitle")}</Text>
            <Pressable onPress={() => setIsRoutineModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#444" />
            </Pressable>
          </View>
          <FlatList
            data={routines}
            keyExtractor={(item) => item.routineId}
            renderItem={renderRoutineOption}
            ItemSeparatorComponent={() => (
              <View style={styles.modalSeparator} />
            )}
            contentContainerStyle={styles.modalListContent}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  segmentedControl: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 2,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  segmentText: {
    fontSize: 14,
    color: "#555",
  },
  segmentTextActive: {
    fontSize: 14,
    color: "#007bff",
    fontWeight: "bold",
  },
  pickerContainer: {
    marginTop: 16,
  },
  createAnalysisLink: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  createAnalysisText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "600",
  },
  analysisContainer: {
    marginTop: 12,
    backgroundColor: "#f5f7fb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e6f0",
  },
  analysisPreview: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e6f0",
  },
  analysisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  analysisIcon: {
    marginLeft: 2,
  },
  analysisTextBlock: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  analysisMeta: {
    fontSize: 12,
    color: "#5f6368",
    marginTop: 2,
  },
  analysisBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  manualBadge: {
    backgroundColor: "#d1f2e8",
  },
  aiBadge: {
    backgroundColor: "#dcd9ff",
  },
  analysisBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#333",
  },
  previewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  previewHint: {
    fontSize: 12,
    color: "#5f6368",
  },
  analysisEmptyState: {
    marginTop: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ececec",
  },
  analysisEmptyText: {
    marginTop: 6,
    fontSize: 14,
    color: "#9e9e9e",
  },
  modalTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c5d1eb",
  },
  modalTriggerText: {
    fontSize: 14,
    color: "#007bff",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5ff",
    paddingTop: 50,
  },
  modalHeader: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  modalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  modalItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e6f0",
  },
  modalItemSelected: {
    borderColor: "#007bff",
    backgroundColor: "#eaf3ff",
  },
  modalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalItemTextBlock: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  modalItemMeta: {
    fontSize: 13,
    color: "#5f6368",
    marginTop: 2,
  },
  modalItemCheck: {
    marginTop: 8,
  },
  modalSeparator: {
    height: 12,
  },
  noteContainer: {
    marginTop: 16,
  },
  textInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 8,
    fontSize: 14,
  },
});
