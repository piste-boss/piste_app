import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getMemberInfo,
  getPersonalityCounseling,
  getBodyCounseling,
  getDietCounseling,
} from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CounselingTopPage({ params }: Props) {
  const { id } = await params;
  const [member, personality, body, diet] = await Promise.all([
    getMemberInfo(id),
    getPersonalityCounseling(id),
    getBodyCounseling(id),
    getDietCounseling(id),
  ]);

  const items = [
    {
      title: "性格診断",
      description: "トレーニングスタイルの傾向を診断し、AI が指導ポイントを自動生成します",
      href: `/trainer/members/${id}/counseling/personality`,
      completed: !!personality,
      summary: personality?.training_style
        ? `タイプ: ${personality.training_style}`
        : null,
    },
    {
      title: "体のお悩み",
      description: "部位別の悩み、既往歴、目標を記録します",
      href: `/trainer/members/${id}/counseling/body`,
      completed: !!body,
      summary: body?.goals
        ? `目標: ${((body.goals as { items?: string[] })?.items || []).join("、")}`
        : null,
    },
    {
      title: "食事",
      description: "食事の傾向やアレルギー、改善目標を記録します",
      href: `/trainer/members/${id}/counseling/diet`,
      completed: !!diet,
      summary: diet?.meal_frequency
        ? `食事回数: ${diet.meal_frequency}回/日`
        : null,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/trainer/members/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; 会員詳細に戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {member.last_name} {member.first_name} 様 - カウンセリング
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          初回来店時のヒアリング内容を記録します
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{item.title}</CardTitle>
                  <Badge variant={item.completed ? "default" : "outline"}>
                    {item.completed ? "入力済み" : "未入力"}
                  </Badge>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              {item.summary && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
