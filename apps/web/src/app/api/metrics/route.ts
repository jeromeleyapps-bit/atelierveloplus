import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialiser Supabase (remplacez ces valeurs par les vôtres)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase credentials are not set. Metrics will not be saved to the database.",
  );
}

// Do NOT initialize Supabase at module load unless credentials are present
// to avoid build-time validation errors when envs are not configured.

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Enregistrer les métriques dans Supabase si les identifiants sont configurés
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const metrics = Array.isArray(data) ? data : [data];
      const { error } = await supabase.from("metrics").insert(
        metrics.map((metric) => ({
          name: metric.name,
          value: metric.value || null,
          data: metric,
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get("user-agent") || "",
          path: request.headers.get("referer") || "",
        })),
      );

      if (error) {
        console.error("Error saving metrics to Supabase:", error);
        return NextResponse.json(
          { error: "Failed to save metrics" },
          { status: 500 },
        );
      }
      return NextResponse.json({ success: true });
    }

    // When not configured, return success (no-op)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Optionnel : Ajouter une route GET pour récupérer les métriques
export async function GET() {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 501 },
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("metrics")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
