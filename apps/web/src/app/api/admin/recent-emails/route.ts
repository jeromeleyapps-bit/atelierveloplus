import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/recent-emails
 * Récupère les derniers emails envoyés via Resend
 */
export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY non configurée" },
        { status: 500 }
      );
    }

    // Appel à l'API Resend pour récupérer les derniers emails
    const response = await fetch("https://api.resend.com/emails", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Resend API error:", response.status);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des emails" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Formater les données pour l'affichage
    const emails = (data.data || []).slice(0, 5).map((email: any) => ({
      id: email.id,
      to: email.to,
      subject: email.subject,
      status: email.last_event || "sent",
      createdAt: email.created_at,
    }));

    return NextResponse.json({ emails }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching recent emails:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
