import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { uid, role } = await req.json();

    // Validate role
    const validRoles = ["client", "doctor", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Set Firebase Auth custom claim
    await adminAuth.setCustomUserClaims(uid, { role });

    // Update Firestore user document
    await adminDb.collection("users").doc(uid).update({
      role,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, uid, role });

  } catch (error) {
    console.error("set-role error:", error);
    return NextResponse.json(
      { error: "Failed to set role" },
      { status: 500 }
    );
  }
}
