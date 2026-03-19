import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MemberDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">マイページ</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">直近のトレーニング</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">まだ記録がありません</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">体重推移</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">体重を記録しましょう</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
