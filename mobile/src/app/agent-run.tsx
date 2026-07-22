import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFontMultiplier } from '@/components/ui';
import { colors } from '@/constants/theme';
import {
  type AgentChatTurn,
  type AgentConversationMode,
  fetchUserQuota,
  generateAIChatReplyLive,
  generateLocalAgentSummary,
  generateOfflineChatResponse,
  requestAgentReview,
  runAgentAnalysis,
} from '@/services/agent';
import { useAgentStore } from '@/store/use-agent-store';
import { useAppStore } from '@/store/use-app-store';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

const quickPrompts = [
  '💊 ในตู้ยาของฉันมียาตีกันไหม?',
  '🍊 ส้มโอกินร่วมกับยาความดันได้ไหม?',
  '🥛 ดื่มนมพร้อมยาได้หรือไม่?',
  '⏰ ควรปฏิบัติตามตารางยาอย่างไร?',
];

let chatMessageSequence = 0;
const nextChatMessageId = (sender: ChatMessage['sender']) => `${sender}-${++chatMessageSequence}`;

export default function AgentRunScreen() {
  const router = useRouter();
  const multiplier = useFontMultiplier();
  const {
    latestSummary,
    previousSummary,
    reviewRequested,
    quotaRemaining,
    currentTier,
    maxWeeklyQuota,
    setAnalysisResult,
    updateQuotaState,
    setReviewRequested,
    isAnalyzing,
    setAnalyzing,
  } = useAgentStore();

  const profile = useAppStore((state) => state.profile);

  const [activeTab, setActiveTab] = useState<'summary' | 'chat'>('summary');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evidence Accordion Toggle State
  const [expandedEvidenceCategory, setExpandedEvidenceCategory] = useState<string | null>(null);

  // Review Request Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Sandbox & Control Panel Modal State
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [outageMode, setOutageMode] = useState<boolean>(false);

  // Chat State
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationMode, setConversationMode] = useState<AgentConversationMode>('general');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: `สวัสดีครับคุณ ${profile.displayName || profile.username || 'ผู้ใช้งาน'} 🤖 ระบบจะแจ้งให้เห็นชัดว่าคำตอบใดมาจาก AI Live กฎความปลอดภัยบนเซิร์ฟเวอร์ หรือโหมดออฟไลน์ และจะไม่ปรับยาให้เอง สามารถพิมพ์สอบถามข้อมูลเรื่องยา อาการแพ้ยา และตารางยาได้ครับ`,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollViewRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserQuota().then((q) => {
      if (q) {
        updateQuotaState(q.quota_remaining ?? 7, q.current_tier ?? 'free', q.max_weekly_quota ?? 7);
      }
    });
  }, [updateQuotaState]);

  const [analysisStep, setAnalysisStep] = useState<number>(0);

  const handleRunAnalysis = async () => {
    setErrorMsg(null);
    setAnalyzing(true);
    setAnalysisStep(1);

    try {
      setAnalysisStep(2);
      if (__DEV__ && outageMode) {
        const localSummary = generateLocalAgentSummary();
        setAnalysisResult(localSummary, quotaRemaining, currentTier, maxWeeklyQuota);
        setReviewRequested(false);
        return;
      }
      setAnalysisStep(3);
      const res = await runAgentAnalysis();
      setAnalysisStep(4);

      if (!res.success && res.error_code === 'QUOTA_EXCEEDED') {
        setErrorMsg(res.message || 'คุณใช้โควตาฟรีครบ 7 ครั้งในสัปดาห์นี้แล้ว');
        updateQuotaState(0, res.current_tier || 'free', res.max_weekly_quota ?? maxWeeklyQuota);
        return;
      }

      if (res.summary) {
        setAnalysisResult(
          res.summary,
          res.quota_remaining ?? quotaRemaining,
          res.current_tier ?? currentTier,
          res.max_weekly_quota ?? maxWeeklyQuota,
        );
        setReviewRequested(false);
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล');
    } finally {
      setAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const q = await fetchUserQuota();
      const newQuota = q?.quota_remaining ?? 7;
      const newTier = q?.current_tier ?? 'free';
      const maxQuota = q?.max_weekly_quota ?? 7;

      updateQuotaState(newQuota, newTier, maxQuota);
    } catch {
      setErrorMsg('ไม่สามารถตรวจสอบโควตาจากเซิร์ฟเวอร์ได้');
    } finally {
      setRefreshing(false);
    }
  }, [updateQuotaState]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: nextChatMessageId('user'),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    const conversationHistory: AgentChatTurn[] = chatMessages
      .filter((message) => message.id !== 'welcome')
      .slice(-10)
      .map((message) => ({
        role: message.sender === 'user' ? 'user' : 'assistant',
        content: message.text,
      }));

    setChatMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = __DEV__ && outageMode
        ? generateOfflineChatResponse(text, conversationHistory, conversationMode)
        : await generateAIChatReplyLive(text, conversationHistory, conversationMode);
      setConversationMode(response.conversationMode);
      const agentMsg: ChatMessage = {
        id: nextChatMessageId('agent'),
        sender: 'agent',
        text: response.text,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, agentMsg]);
    } catch {
      const fallback = generateOfflineChatResponse(text, conversationHistory, conversationMode);
      setConversationMode(fallback.conversationMode);
      const agentMsg: ChatMessage = {
        id: nextChatMessageId('agent'),
        sender: 'agent',
        text: fallback.text,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, agentMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleConfirmReview = async () => {
    if (!latestSummary || !latestSummary.allowedActions.includes('request_professional_review') || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await requestAgentReview(latestSummary.summaryId);
      setReviewRequested(true);
      setShowConfirmModal(false);
      Alert.alert('บันทึกคำขอสำเร็จ 📩', 'คำขอถูกบันทึกเป็นสถานะรอตรวจทาน คุณสามารถติดตามสถานะได้เมื่อระบบผู้เชี่ยวชาญพร้อมใช้งาน');
    } catch (error) {
      Alert.alert('ส่งคำขอไม่สำเร็จ', error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const toggleEvidence = (category: string) => {
    setExpandedEvidenceCategory((prev) => (prev === category ? null : category));
  };

  const isUnlimited = currentTier === 'admin' || quotaRemaining >= 999;
  const canRequestReview = Boolean(latestSummary?.allowedActions.includes('request_professional_review'));
  const summaryChanges = useMemo(() => {
    if (!previousSummary || !latestSummary) return [];
    const previousRows = new Map(previousSummary.rows.map((row) => [row.category, row]));
    return latestSummary.rows.flatMap((row) => {
      const previous = previousRows.get(row.category);
      if (!previous) return [`เพิ่มข้อมูลหมวด ${getCategoryLabel(row.category)}`];
      if (previous.status !== row.status || previous.latestData !== row.latestData || previous.finding !== row.finding) {
        return [`${getCategoryLabel(row.category)}: ${previous.latestData ?? '-'} → ${row.latestData ?? '-'}`];
      }
      return [];
    });
  }, [latestSummary, previousSummary]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* App Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { fontSize: 16 * multiplier }]}>‹ ย้อนกลับ</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: 18 * multiplier }]}>AI Care Agent</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>
              {isUnlimited ? '👑 Admin (Unlimited)' : `${currentTier.toUpperCase()} (${quotaRemaining}/${maxWeeklyQuota})`}
            </Text>
          </View>
          {__DEV__ ? (
            <TouchableOpacity onPress={() => setShowSandboxModal(true)} style={styles.sandboxBtn}>
              <Text style={{ fontSize: 14 }}>⚙️</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Segment Switcher Tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'summary' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.segmentText, activeTab === 'summary' && styles.segmentTextActive]}>
            📋 สรุปผลความปลอดภัย
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'chat' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.segmentText, activeTab === 'chat' && styles.segmentTextActive]}>
            💬 สนทนากับ AI
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'summary' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Main Banner Card */}
          <View style={styles.bannerCard}>
            <View style={styles.iconTitleRow}>
              <Text style={{ fontSize: 28 }}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { fontSize: 18 * multiplier }]}>ผู้ช่วย AI วิเคราะห์ความปลอดภัย</Text>
                <Text style={[styles.bannerSub, { fontSize: 13 * multiplier }]}>
                  ดึงหน้าจอลงเพื่อรีเฟรชโควตา หรือกดปุ่มเริ่มวิเคราะห์เพื่อประมวลผลประวัติล่าสุด
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.runBtn, isAnalyzing && styles.runBtnDisabled]}
              onPress={handleRunAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[styles.runBtnText, { fontSize: 15 * multiplier }]}>⚡ เริ่มการวิเคราะห์ความปลอดภัยล่าสุด</Text>
              )}
            </TouchableOpacity>

          </View>

          {/* 4-Step Analysis Progress Card */}
          {isAnalyzing && (
            <View style={styles.progressStepCard}>
              <Text style={[styles.progressStepHeader, { fontSize: 15 * multiplier }]}>
                ⏳ กำลังวิเคราะห์ประวัติสุขภาพตามแผนความปลอดภัย...
              </Text>
              {[
                { title: '1. เตรียมคำขอที่ยืนยันตัวตน', desc: 'ส่งเฉพาะข้อมูลที่จำเป็นไปยัง Agent Server' },
                { title: '2. สร้าง Snapshot และตรวจ Clinical Rules', desc: 'ประมวลผลใน Edge Function และฐานข้อมูลที่เผยแพร่แล้ว' },
                { title: '3. เรียบเรียงผลแบบมีข้อจำกัด', desc: 'ใช้ AI เฉพาะการเรียบเรียงเมื่อบริการพร้อม' },
                { title: '4. บันทึก Run และ Evidence', desc: 'เก็บผลสรุปและเส้นทางตรวจสอบย้อนหลัง' },
              ].map((step, idx) => {
                const stepNum = idx + 1;
                const isDone = analysisStep > stepNum;
                const isActive = analysisStep === stepNum;
                return (
                  <View key={idx} style={styles.progressStepItem}>
                    <View
                      style={[
                        styles.progressStepBadge,
                        isDone && styles.progressStepDone,
                        isActive && styles.progressStepActive,
                      ]}
                    >
                      <Text style={styles.progressStepBadgeText}>{isDone ? '✓' : stepNum}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.progressStepTitle,
                          isActive && { color: colors.primaryDark, fontWeight: '900' },
                          isDone && { color: colors.success, fontWeight: '800' },
                        ]}
                      >
                        {step.title}
                      </Text>
                      <Text style={styles.progressStepSub}>{step.desc}</Text>
                    </View>
                    {isActive && <ActivityIndicator size="small" color={colors.primary} />}
                  </View>
                );
              })}
            </View>
          )}

          {/* Error / Quota Exceeded Card */}
          {errorMsg ? (
            <View style={styles.errorCard}>
              <Text style={[styles.errorTitle, { fontSize: 15 * multiplier }]}>⚠️ ไม่สามารถวิเคราะห์ได้ในขณะนี้</Text>
              <Text style={[styles.errorText, { fontSize: 13 * multiplier }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Diff & Delta Banner if previous summary exists */}
          {summaryChanges.length > 0 && (
            <View style={styles.diffCard}>
              <Text style={[styles.diffTitle, { fontSize: 14 * multiplier }]}>⚠️ ความเปลี่ยนแปลงจากผลสรุปครั้งก่อน</Text>
              {summaryChanges.slice(0, 4).map((change) => (
                <Text key={change} style={[styles.diffDesc, { fontSize: 12 * multiplier }]}>• {change}</Text>
              ))}
            </View>
          )}

          {/* LLM Personalized Advice Card */}
          {latestSummary?.llmPersonalizedAdvice ? (
            <View style={styles.llmAdviceCard}>
              <View style={styles.llmHeader}>
                <Text style={{ fontSize: 18 }}>✨</Text>
                <Text style={[styles.llmTitle, { fontSize: 15 * multiplier }]}>
                  {latestSummary.executionMode === 'live'
                    ? 'บทวิเคราะห์ที่เรียบเรียงโดย AI (Live)'
                    : 'ผลคัดกรองจากกฎความปลอดภัย (ไม่ใช้ AI)'}
                </Text>
              </View>
              <Text style={[styles.llmAdviceText, { fontSize: 14 * multiplier }]}>{latestSummary.llmPersonalizedAdvice}</Text>
            </View>
          ) : null}

          {/* Review Request Card */}
          <View style={styles.reviewCard}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reviewTitle, { fontSize: 15 * multiplier }]}>📩 ส่งคำขอเพื่อตรวจทาน</Text>
              <Text style={[styles.reviewSub, { fontSize: 12 * multiplier }]}>
                บันทึกผลสรุปล่าสุดเข้าสู่คิวรอตรวจทาน ระบบจะไม่เปลี่ยนแผนการรักษาอัตโนมัติ
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.reviewBtn, (reviewRequested || !canRequestReview) && styles.reviewBtnDone]}
              onPress={() => !reviewRequested && canRequestReview && setShowConfirmModal(true)}
              disabled={reviewRequested || !canRequestReview}
            >
              <Text style={styles.reviewBtnText}>
                {reviewRequested ? 'ส่งคำขอแล้ว ✓' : canRequestReview ? 'ขอคำแนะนำ' : 'ต้องใช้ผลจากเซิร์ฟเวอร์'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Structured Summary Results */}
          {latestSummary ? (
            <View style={styles.resultsContainer}>
              <Text style={[styles.sectionTitle, { fontSize: 17 * multiplier }]}>📋 ผลการสรุปความปลอดภัย (Unified Summary)</Text>

              {latestSummary.rows.map((row, index) => {
                const statusStyle = getStatusBadgeStyle(row.status);
                const isExpanded = expandedEvidenceCategory === row.category;
                return (
                  <View key={index} style={styles.rowCard}>
                    <View style={styles.rowHeader}>
                      <Text style={[styles.categoryTitle, { fontSize: 15 * multiplier }]}>{getCategoryLabel(row.category)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.fg }]}>{getStatusLabel(row.status)}</Text>
                      </View>
                    </View>

                    <Text style={[styles.findingText, { fontSize: 14 * multiplier }]}>{row.finding}</Text>

                    {row.completeness < 100 && (
                      <View style={styles.incompleteBadge}>
                        <Text style={styles.incompleteText}>⚠️ ข้อมูลยังไม่สมบูรณ์ ({row.completeness}%)</Text>
                      </View>
                    )}

                    {/* Accordion Evidence Toggle Button */}
                    <TouchableOpacity
                      style={styles.evidenceToggleBtn}
                      onPress={() => toggleEvidence(row.category)}
                      disabled={!row.evidenceRefs.length}
                    >
                      <Text style={styles.evidenceToggleText}>
                        {!row.evidenceRefs.length
                          ? 'ไม่มีหลักฐานอ้างอิงสำหรับรายการนี้'
                          : isExpanded
                            ? '🔼 ปิดหลักฐานอ้างอิงเชิงคลินิก'
                            : '🔎 ดูหลักฐานอ้างอิงเชิงคลินิก'}
                      </Text>
                    </TouchableOpacity>

                    {/* Expanded Evidence Sheet Box */}
                    {isExpanded && row.evidenceRefs && row.evidenceRefs.length > 0 && (
                      <View style={styles.evidenceSheet}>
                        <Text style={styles.evidenceSheetTitle}>🔗 ตรวจสอบหลักฐานเชิงคลินิก (Evidence Ref):</Text>
                        {row.evidenceRefs.map((ev, i) => (
                          <View key={i} style={styles.evidenceItem}>
                            <Text style={styles.evidenceItemText}>• ประเภท: {ev.type}</Text>
                            <Text style={styles.evidenceItemText}>• แหล่งอ้างอิง: {ev.id}</Text>
                            {ev.description && <Text style={styles.evidenceItemText}>• รายละเอียด: {ev.description}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            !isAnalyzing && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { fontSize: 14 * multiplier }]}>
                  ยังไม่มีผลการสรุปร่าสุด กดปุ่มด้านบนเพื่อเริ่มวิเคราะห์ความปลอดภัยในการทานยา
                </Text>
              </View>
            )
          )}
        </ScrollView>
      ) : (
        /* Chat Playground Tab */
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {/* Quick Prompts */}
            <Text style={[styles.quickPromptTitle, { fontSize: 13 * multiplier }]}>💡 คำถามสืบค้นที่พบบ่อย:</Text>
            {conversationMode === 'symptom_intake' ? (
              <View style={styles.intakeStatusRow}>
                <Text style={styles.intakeStatusText}>🩺 กำลังซักประวัติอาการก่อนประเมินเรื่องยา</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="เริ่มคำถามใหม่และล้างประวัติการซักอาการ"
                  hitSlop={8}
                  style={styles.newConversationButton}
                  onPress={() => {
                    setConversationMode('general');
                    setChatMessages((messages) => messages.slice(0, 1));
                    setInputText('');
                  }}
                >
                  <Text style={styles.newConversationText}>เริ่มคำถามใหม่</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {quickPrompts.map((prompt, i) => (
                <TouchableOpacity key={i} style={styles.promptChip} onPress={() => handleSendMessage(prompt)}>
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Chat History */}
            {chatMessages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.sender === 'user' ? styles.userBubble : styles.agentBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === 'user' ? styles.userText : styles.agentText,
                    { fontSize: 15 * multiplier },
                  ]}
                >
                  {msg.text}
                </Text>
                <Text style={styles.timestampText}>{msg.timestamp}</Text>
              </View>
            ))}

            {isTyping && (
              <View style={[styles.messageBubble, styles.agentBubble, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <ActivityIndicator size="small" color={colors.primaryDark} />
                <Text style={{ color: colors.muted, fontSize: 13 }}>AI Care Agent กำลังพิมพ์...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.chatInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="พิมพ์คำถามเรื่องยา อาการแพ้ หรือของแสลง..."
              placeholderTextColor={colors.muted}
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendBtnText}>ส่ง</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Confirmation Modal for Review Request */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🏥</Text>
            <Text style={styles.modalTitle}>ยืนยันคำขอรีวิวประวัติการทานยา</Text>
            <Text style={styles.modalSub}>
              ระบบจะบันทึกผลสรุปล่าสุดเป็นคำขอสถานะ “รอตรวจทาน” โดยยังไม่ถือว่าแพทย์หรือเภสัชกรได้รับหรือรับรองผลนี้
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmReview} disabled={reviewSubmitting}>
                <Text style={styles.modalConfirmText}>{reviewSubmitting ? 'กำลังบันทึก...' : 'ยืนยันบันทึกคำขอ'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Developer Sandbox & Control Panel Modal */}
      {__DEV__ ? <Modal visible={showSandboxModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.sandboxModalBox}>
            <View style={styles.sandboxHeader}>
              <Text style={styles.sandboxTitle}>⚙️ AI Control Panel & Sandbox</Text>
              <TouchableOpacity onPress={() => setShowSandboxModal(false)}>
                <Text style={{ fontSize: 18, color: colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sandboxContent}>
              <View style={styles.sandboxRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sandboxLabel}>จำลองระบบ AI ขัดข้อง (Outage Mode)</Text>
                  <Text style={styles.sandboxSub}>สวิตช์บังคับความล้มเหลวเพื่อทดสอบ Offline Safety Engine</Text>
                </View>
                <Switch value={outageMode} onValueChange={setOutageMode} trackColor={{ true: colors.warning }} />
              </View>

              <View style={styles.sandboxInfo}>
                <Text style={styles.sandboxLabel}>Runtime configuration มาจาก Clinical Admin</Text>
                <Text style={styles.sandboxSub}>Model, fallback, temperature และ token limit ถูกควบคุมจากเซิร์ฟเวอร์ ผู้ใช้มือถือเปลี่ยนค่าเหล่านี้ไม่ได้</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.sandboxCloseBtn} onPress={() => setShowSandboxModal(false)}>
              <Text style={styles.sandboxCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> : null}
    </KeyboardAvoidingView>
  );
}

function getCategoryLabel(cat: string) {
  const map: Record<string, string> = {
    conditions: '🏥 โรคประจำตัวของคุณ',
    allergies: '⚠️ ประวัติยาที่เคยแพ้',
    drug_interactions: '💊 ยาที่เสี่ยงตีกันหรือทานร่วมกันไม่ได้',
    medication_schedule: '⏰ ตารางเวลากินยาประจำวัน',
    medicine_cabinet: '🗄️ ยาในตู้ยาของคุณ',
    adherence: '📊 สถิติความตรงเวลาในการกินยา',
    body_metrics: '⚖️ น้ำหนักตัวและสุขภาพร่างกาย',
  };
  return map[cat] || cat;
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    ok: 'ปลอดภัยดี',
    info: 'ข้อมูลทั่วไป',
    needs_data: 'ยังขาดข้อมูลสำคัญ',
    needs_attention: 'ควรระมัดระวัง',
    review_required: 'ต้องให้ผู้เชี่ยวชาญตรวจ',
    critical: 'เสี่ยงอันตรายรุนแรง',
  };
  return map[status] || status;
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'ok':
      return { bg: colors.successSoft, fg: colors.success };
    case 'needs_data':
      return { bg: colors.warningSoft, fg: colors.warning };
    case 'needs_attention':
    case 'review_required':
    case 'critical':
      return { bg: colors.dangerSoft, fg: colors.danger };
    default:
      return { bg: colors.primarySoft, fg: colors.primaryDark };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  tierBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  sandboxBtn: {
    padding: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primarySoft,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 14,
  },
  segmentTextActive: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  bannerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  bannerSub: {
    color: colors.muted,
    lineHeight: 19,
    marginTop: 2,
  },
  runBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  runBtnDisabled: {
    opacity: 0.6,
  },
  runBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: 6,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '800',
  },
  errorText: {
    color: colors.text,
  },
  diffCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: 4,
  },
  diffTitle: {
    color: colors.warning,
    fontWeight: '800',
  },
  diffDesc: {
    color: colors.text,
    lineHeight: 18,
  },
  llmAdviceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 8,
  },
  llmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  llmTitle: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  llmAdviceText: {
    color: colors.text,
    lineHeight: 22,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewTitle: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  reviewSub: {
    color: colors.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  reviewBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  reviewBtnDone: {
    backgroundColor: colors.muted,
  },
  reviewBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  resultsContainer: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '900',
    marginBottom: 4,
  },
  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  findingText: {
    color: colors.text,
    lineHeight: 21,
  },
  incompleteBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  incompleteText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  evidenceToggleBtn: {
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  evidenceToggleText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  evidenceSheet: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: 6,
    marginTop: 4,
  },
  evidenceSheetTitle: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },
  evidenceItem: {
    gap: 2,
  },
  evidenceItemText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Chat Styles
  chatContent: {
    padding: 16,
    gap: 12,
  },
  quickPromptTitle: {
    color: colors.muted,
    fontWeight: '700',
    marginBottom: 6,
  },
  intakeStatusRow: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  intakeStatusText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  newConversationText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  newConversationButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
  },
  promptChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  promptChipText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryDark,
    borderBottomRightRadius: 2,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    lineHeight: 21,
  },
  userText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  agentText: {
    color: colors.text,
  },
  timestampText: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 12,
  },
  modalTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSub: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: '800',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sandboxModalBox: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  sandboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sandboxTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '900',
  },
  sandboxContent: {
    gap: 12,
  },
  sandboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sandboxLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  sandboxSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  sandboxInfo: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    gap: 4,
  },
  sandboxCloseBtn: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  sandboxCloseText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  progressStepCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  progressStepHeader: {
    color: colors.primaryDark,
    fontWeight: '900',
    marginBottom: 4,
  },
  progressStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepDone: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  progressStepActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  progressStepBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
  },
  progressStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  progressStepSub: {
    fontSize: 11,
    color: colors.muted,
  },
  clearSummaryBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  clearSummaryBtnText: {
    color: colors.text,
    fontWeight: '800',
  },
});
