import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateJsonWithGemini,
  suggestMenu,
  type MemberTrainingData,
} from "@/lib/gemini/client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();

    // Handle personality analysis (existing feature)
    if (body.type === "personality") {
      const result = await generateJsonWithGemini<{
        trainingStyle: string;
        coachingTips: string[];
      }>(`以下の性格診断アンケート結果から、トレーニングの性格タイプ名と指導ポイントを生成してください。

回答: ${JSON.stringify(body.answers)}

JSON形式で返してください:
{
  "trainingStyle": "性格タイプ名（例: 褒められ伸びる型、ストイック追込み型、コツコツ積上げ型）",
  "coachingTips": ["指導ポイント1", "指導ポイント2", "指導ポイント3"]
}`);
      return NextResponse.json(result);
    }

    // Handle AI menu suggestion
    const { memberId, suggestedForDate } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "会員IDは必須です" },
        { status: 400 }
      );
    }

    if (!suggestedForDate) {
      return NextResponse.json(
        { error: "提案日は必須です" },
        { status: 400 }
      );
    }

    // Verify trainer-member relationship
    const { data: trainerMember } = await supabase
      .from("trainer_members")
      .select("id")
      .eq("trainer_id", user.id)
      .eq("member_id", memberId)
      .eq("status", "active")
      .single();

    if (!trainerMember) {
      return NextResponse.json(
        { error: "この会員の担当トレーナーではありません" },
        { status: 403 }
      );
    }

    // Gather all data in parallel
    const [
      { data: member },
      { data: sessions },
      { data: weights },
      { data: personality },
      { data: bodyData },
      { data: dietData },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("last_name, first_name, date_of_birth")
        .eq("id", memberId)
        .single(),
      supabase
        .from("workout_sessions")
        .select(
          "id, session_date, session_sets(id, exercise_id, set_number, weight_kg, reps, notes, exercises(name, muscle_group))"
        )
        .eq("member_id", memberId)
        .in("status", ["confirmed", "completed"])
        .order("session_date", { ascending: false })
        .limit(10),
      supabase
        .from("body_weight")
        .select("recorded_at, weight_kg")
        .eq("member_id", memberId)
        .order("recorded_at", { ascending: false })
        .limit(20),
      supabase
        .from("counseling_personality")
        .select("training_style, coaching_tips")
        .eq("member_id", memberId)
        .single(),
      supabase
        .from("counseling_body")
        .select("goals, concerns, medical_history")
        .eq("member_id", memberId)
        .single(),
      supabase
        .from("counseling_diet")
        .select(
          "meal_frequency, dietary_notes, allergies, improvement_goals"
        )
        .eq("member_id", memberId)
        .single(),
    ]);

    // Structure training history data
    const trainingHistory =
      sessions?.map((session) => {
        // Group sets by exercise
        const exerciseMap: Record<
          string,
          {
            name: string;
            muscleGroup: string;
            sets: {
              setNumber: number;
              weightKg: number | null;
              reps: number | null;
              notes: string | null;
            }[];
          }
        > = {};

        const sets = (session.session_sets ?? []) as unknown as Array<{
          id: string;
          exercise_id: string;
          set_number: number;
          weight_kg: number | null;
          reps: number | null;
          notes: string | null;
          exercises: { name: string; muscle_group: string } | null;
        }>;

        for (const set of sets) {
          const exerciseName =
            set.exercises?.name ?? "不明な種目";
          const muscleGroup =
            set.exercises?.muscle_group ?? "その他";
          if (!exerciseMap[exerciseName]) {
            exerciseMap[exerciseName] = {
              name: exerciseName,
              muscleGroup,
              sets: [],
            };
          }
          exerciseMap[exerciseName].sets.push({
            setNumber: set.set_number,
            weightKg: set.weight_kg,
            reps: set.reps,
            notes: set.notes,
          });
        }

        return {
          sessionDate: session.session_date,
          exercises: Object.values(exerciseMap),
        };
      }) ?? [];

    // Build the data object for the prompt
    const memberData: MemberTrainingData = {
      memberName: member
        ? `${member.last_name} ${member.first_name}`
        : "不明",
      dateOfBirth: member?.date_of_birth ?? null,
      trainingHistory,
      weightHistory:
        weights?.map((w) => ({
          date:
            typeof w.recorded_at === "string"
              ? w.recorded_at.split("T")[0]
              : "",
          weightKg: w.weight_kg,
        })) ?? [],
      personality: personality
        ? {
            trainingStyle: personality.training_style,
            coachingTips: Array.isArray(personality.coaching_tips)
              ? (personality.coaching_tips as unknown[])
              : null,
          }
        : null,
      bodyGoals: bodyData
        ? {
            goals: bodyData.goals,
            concerns: bodyData.concerns,
            medicalHistory: bodyData.medical_history,
          }
        : null,
      diet: dietData
        ? {
            mealFrequency: dietData.meal_frequency,
            dietaryNotes: dietData.dietary_notes,
            allergies: dietData.allergies,
            improvementGoals: dietData.improvement_goals,
          }
        : null,
      suggestedForDate,
    };

    // Call Gemini API for menu suggestion
    const suggestion = await suggestMenu(memberData);

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from("ai_menu_suggestions")
      .insert({
        member_id: memberId,
        trainer_id: user.id,
        suggested_for_date: suggestedForDate,
        suggestion: suggestion as unknown as Record<string, unknown>,
        reasoning: suggestion.reasoning,
        status: "pending",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save suggestion:", saveError);
      // Still return the suggestion even if save fails
      return NextResponse.json({
        suggestion,
        saved: false,
        error: "提案の保存に失敗しましたが、結果は表示できます",
      });
    }

    return NextResponse.json({
      id: saved.id,
      suggestion,
      saved: true,
    });
  } catch (error) {
    console.error("AI suggest error:", error);
    const message =
      error instanceof Error ? error.message : "AI提案の生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET: 会員の過去の提案履歴を取得 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId");
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

    let query = supabase
      .from("ai_menu_suggestions")
      .select("*, users!ai_menu_suggestions_member_id_fkey(last_name, first_name)")
      .eq("trainer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (memberId) {
      query = query.eq("member_id", memberId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch suggestions:", error);
      return NextResponse.json(
        { error: "提案履歴の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions: data ?? [] });
  } catch (error) {
    console.error("Fetch suggestions error:", error);
    return NextResponse.json(
      { error: "提案履歴の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/** PATCH: 提案のステータスを更新 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "IDとステータスは必須です" },
        { status: 400 }
      );
    }

    const validStatuses = ["accepted", "modified", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `ステータスは ${validStatuses.join(", ")} のいずれかです` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_menu_suggestions")
      .update({ status })
      .eq("id", id)
      .eq("trainer_id", user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "ステータスの更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "ステータスの更新に失敗しました" },
      { status: 500 }
    );
  }
}
