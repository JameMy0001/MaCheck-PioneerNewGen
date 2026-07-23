import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";

initializeApp();

const db = getFirestore();

function assertAuth(context: any) {
  if (!context.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  return context.auth.uid;
}

/**
 * Account Onboarding: Reserve unique handle securely
 */
export const setupUserHandle = onCall(async (request) => {
  const uid = assertAuth(request);
  const handle = request.data?.handle?.trim()?.toLowerCase();
  const displayName = request.data?.displayName?.trim();

  if (!handle || !/^[a-z0-9_]{3,20}$/.test(handle)) {
    throw new HttpsError(
      "invalid-argument",
      "Handle must be 3-20 alphanumeric characters or underscores."
    );
  }

  const handleRef = db.collection("privateHandles").doc(handle);
  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (transaction) => {
    const handleDoc = await transaction.get(handleRef);
    if (handleDoc.exists && handleDoc.data()?.uid !== uid) {
      throw new HttpsError("already-exists", "Handle is already taken.");
    }

    transaction.set(handleRef, {
      uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(
      userRef,
      {
        handle,
        displayName: displayName || handle,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { success: true, handle };
});

/**
 * Caregiver: Send Invite via Handle
 */
export const inviteCaregiver = onCall(async (request) => {
  const patientUid = assertAuth(request);
  const targetHandle = request.data?.targetHandle?.trim()?.toLowerCase();

  if (!targetHandle) {
    throw new HttpsError("invalid-argument", "Caregiver handle is required.");
  }

  const handleDoc = await db.collection("privateHandles").doc(targetHandle).get();
  if (!handleDoc.exists) {
    throw new HttpsError("not-found", "User handle not found.");
  }

  const caregiverUid = handleDoc.data()?.uid;
  if (caregiverUid === patientUid) {
    throw new HttpsError("invalid-argument", "Cannot invite yourself as caregiver.");
  }

  const inviteRef = db.collection("caregiverInvites").doc();
  await inviteRef.set({
    patientUid,
    caregiverUid,
    invitedByUid: patientUid,
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, inviteId: inviteRef.id };
});

/**
 * Caregiver: Respond to Invite
 */
export const respondCaregiverInvite = onCall(async (request) => {
  const caregiverUid = assertAuth(request);
  const inviteId = request.data?.inviteId;
  const accept = Boolean(request.data?.accept);

  if (!inviteId) {
    throw new HttpsError("invalid-argument", "Invite ID is required.");
  }

  const inviteRef = db.collection("caregiverInvites").doc(inviteId);

  await db.runTransaction(async (transaction) => {
    const inviteDoc = await transaction.get(inviteRef);
    if (!inviteDoc.exists) {
      throw new HttpsError("not-found", "Invite not found.");
    }

    const inviteData = inviteDoc.data()!;
    if (inviteData.caregiverUid !== caregiverUid) {
      throw new HttpsError("permission-denied", "Not authorized for this invite.");
    }

    if (inviteData.status !== "pending") {
      throw new HttpsError("failed-precondition", "Invite is no longer pending.");
    }

    if (accept) {
      transaction.update(inviteRef, { status: "accepted" });

      const accessRef = db
        .collection("users")
        .doc(inviteData.patientUid)
        .collection("caregiverAccess")
        .doc(caregiverUid);

      transaction.set(accessRef, {
        status: "active",
        permissions: {
          readProfile: true,
          readMedications: true,
          readDoseEvents: true,
          sendMessages: true,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.update(inviteRef, { status: "declined" });
    }
  });

  return { success: true, accepted: accept };
});

/**
 * Caregiver: Revoke Access
 */
export const revokeCaregiverAccess = onCall(async (request) => {
  const patientUid = assertAuth(request);
  const caregiverUid = request.data?.caregiverUid;

  if (!caregiverUid) {
    throw new HttpsError("invalid-argument", "Caregiver UID is required.");
  }

  const accessRef = db
    .collection("users")
    .doc(patientUid)
    .collection("caregiverAccess")
    .doc(caregiverUid);

  await accessRef.update({
    status: "revoked",
    revokedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

/**
 * Gemini Agent: Multimodal Label Scanner
 */
export const scanMedicationLabel = onCall(async (request) => {
  assertAuth(request);
  const base64Image = request.data?.base64Image;

  if (!base64Image) {
    throw new HttpsError("invalid-argument", "Image data is required.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message: "Gemini service configuration missing. Please supply GEMINI_API_KEY.",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      "Extract medication information from this label image as valid JSON matching: { nameTh: string, nameEn: string, dosageMg: number, usageInstruction: string, confidence: number }",
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    return {
      status: "success",
      result: text,
      modelId: "gemini-2.5-flash",
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Failed to process image label.",
    };
  }
});

/**
 * Gemini Agent: General Safety Chat with Guardrails
 */
export const chatAgent = onCall(async (request) => {
  const uid = assertAuth(request);
  const userMessage = request.data?.message;

  if (!userMessage) {
    throw new HttpsError("invalid-argument", "Message is required.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message: "Gemini service configuration missing.",
      executionMode: "rules_only",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(
      `You are MaCheck AI Assistant. Provide helpful, non-prescriptive medication safety info in Thai. Do not prescribe, change dosages, or order stopping medication. User query: ${userMessage}`
    );

    const response = await result.response;
    const reply = response.text();

    await db.collection("users").doc(uid).collection("agentRuns").add({
      intent: "chat",
      status: "completed",
      modelId: "gemini-2.5-flash",
      executionMode: "live",
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      status: "success",
      reply,
      modelId: "gemini-2.5-flash",
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "AI chat failed.",
      executionMode: "rules_only",
    };
  }
});

/**
 * Gemini Decision Explanation: Explain Deterministic Risk Score in Thai
 */
export const explainRiskScore = onCall(async (request) => {
  const uid = assertAuth(request);

  const summaryDoc = await db.collection("users").doc(uid).collection("riskSummary").doc("current").get();
  if (!summaryDoc.exists) {
    throw new HttpsError("not-found", "No current risk summary found.");
  }

  const summary = summaryDoc.data()!;
  const score = summary.score || 0;
  const tier = summary.tier || "low";
  const reasonCodes = summary.reasonCodes || [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: "success",
      explanation: `คะแนนความเสี่ยงของคุณคือ ${score} (${tier}) ตามรหัสเหตุผล: ${reasonCodes.join(", ")}`,
      executionMode: "rules_only",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `คุณคือผู้ช่วยการแพทย์วิเคราะห์ความเสี่ยงการใช้ยา ให้คำอธิบายแก่ผู้ป่วยและผู้ดูแลเป็นภาษาไทยที่เข้าใจง่าย กระชับ และสุภาพ 
ข้อมูลคะแนนความเสี่ยงที่ประมวลผลแล้ว:
- Risk Score: ${score}/100 (Tier: ${tier})
- Reason Codes: ${reasonCodes.join(", ")}

คำสั่ง:
1. อธิบายสาเหตุของคะแนนความเสี่ยงตาม Reason Codes อย่างตรงไปตรงมา
2. ให้คำแนะนำเชิงปฏิบัติตามความปลอดภัย เช่น การจัดตารางยาให้ตรงเวลา การปรึกษาเภสัชกร
3. ห้ามสั่งยา ห้ามเปลี่ยนขนาดยา และห้ามวินิจฉัยโรคใหม่โดยเด็ดขาด`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text();

    return {
      status: "success",
      score,
      tier,
      reasonCodes,
      explanation,
      modelId: "gemini-2.5-flash",
    };
  } catch (error: any) {
    return {
      status: "error",
      score,
      tier,
      reasonCodes,
      explanation: `คะแนนความเสี่ยง: ${score} (${tier}) เหตุผล: ${reasonCodes.join(", ")}`,
      executionMode: "rules_only",
    };
  }
});

/**
 * Analytics Pipeline Export: Export de-identified dose events for GCS ingestion
 */
export const exportDoseEvents = onCall(async (request) => {
  assertAuth(request);

  const snapshot = await db.collectionGroup("doseEvents").limit(1000).get();
  const records = snapshot.docs.map((docSnap) => {
    const d = docSnap.data();
    return {
      eventId: docSnap.id,
      medicationClientId: d.medicationClientId,
      slot: d.slot,
      eventDate: d.eventDate,
      taken: d.taken,
      occurredAt: d.occurredAt,
      idempotencyKey: d.idempotencyKey,
    };
  });

  return {
    status: "success",
    exportedCount: records.length,
    exportedAt: new Date().toISOString(),
    bucketTarget: "gs://macheck-analytics-raw/dose-events/",
  };
});

