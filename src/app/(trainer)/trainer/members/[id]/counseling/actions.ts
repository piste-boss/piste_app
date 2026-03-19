"use server";

import { createClient } from "@/lib/supabase/server";
import { analyzePersonality } from "@/lib/gemini/client";
import { revalidatePath } from "next/cache";

// ─── 性格診断 ────────────────────────────────────────

export async function getPersonalityCounseling(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counseling_personality")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function savePersonalityCounseling(
  memberId: string,
  answers: Record<string, string>,
  trainingStyle: string,
  coachingTips: string[]
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("counseling_personality")
    .select("id")
    .eq("member_id", memberId)
    .limit(1)
    .maybeSingle();

  const payload = {
    member_id: memberId,
    answers,
    training_style: trainingStyle,
    coaching_tips: { tips: coachingTips },
  };

  if (existing) {
    const { error } = await supabase
      .from("counseling_personality")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("counseling_personality")
      .insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/trainer/members/${memberId}/counseling`);
}

export async function generatePersonalityAnalysis(
  answers: Record<string, string>
) {
  const result = await analyzePersonality(answers);
  return result;
}

// ─── 体のお悩み ────────────────────────────────────────

export async function getBodyCounseling(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counseling_body")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveBodyCounseling(
  memberId: string,
  concerns: string[],
  medicalHistory: string,
  goals: string[]
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("counseling_body")
    .select("id")
    .eq("member_id", memberId)
    .limit(1)
    .maybeSingle();

  const payload = {
    member_id: memberId,
    concerns: { items: concerns },
    medical_history: medicalHistory,
    goals: { items: goals },
  };

  if (existing) {
    const { error } = await supabase
      .from("counseling_body")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("counseling_body")
      .insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/trainer/members/${memberId}/counseling`);
}

// ─── 食事 ────────────────────────────────────────

export async function getDietCounseling(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counseling_diet")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveDietCounseling(
  memberId: string,
  mealFrequency: number,
  mealTimes: string[],
  dietaryNotes: string,
  allergies: string[],
  improvementGoals: string
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("counseling_diet")
    .select("id")
    .eq("member_id", memberId)
    .limit(1)
    .maybeSingle();

  const payload = {
    member_id: memberId,
    meal_frequency: mealFrequency,
    meal_times: { times: mealTimes },
    dietary_notes: dietaryNotes,
    allergies: { items: allergies },
    improvement_goals: improvementGoals,
  };

  if (existing) {
    const { error } = await supabase
      .from("counseling_diet")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("counseling_diet")
      .insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/trainer/members/${memberId}/counseling`);
}

// ─── 会員情報 ────────────────────────────────────────

export async function getMemberInfo(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, last_name, first_name")
    .eq("id", memberId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
