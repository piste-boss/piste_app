"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BodyPhoto } from "@/types/database";

export default function MemberPhotosPage() {
  const params = useParams();
  const memberId = params.id as string;
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: user }, { data: photoData }] = await Promise.all([
        supabase.from("users").select("last_name, first_name").eq("id", memberId).single(),
        supabase
          .from("body_photos")
          .select("*")
          .eq("member_id", memberId)
          .order("taken_at", { ascending: true }),
      ]);
      if (user) setMemberName(`${user.last_name} ${user.first_name}`);
      if (photoData) setPhotos(photoData);
      setLoading(false);
    };
    load();
  }, [memberId]);

  if (loading) return <div className="p-6">読み込み中...</div>;

  const photosByType = (type: string) =>
    photos.filter((p) => p.photo_type === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{memberName} 様 - 体形変化</h1>
        <Button>新しい写真を撮影</Button>
      </div>

      <Tabs defaultValue="front">
        <TabsList>
          <TabsTrigger value="front">正面</TabsTrigger>
          <TabsTrigger value="side">側面</TabsTrigger>
          <TabsTrigger value="back">背面</TabsTrigger>
        </TabsList>
        {(["front", "side", "back"] as const).map((type) => (
          <TabsContent key={type} value={type}>
            {photosByType(type).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {type === "front" ? "正面" : type === "side" ? "側面" : "背面"}の写真はまだありません
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {photosByType(type).map((photo) => (
                  <Card key={photo.id}>
                    <CardContent className="p-2">
                      <div className="aspect-[3/4] rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        {photo.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.thumbnail_url}
                            alt={`${type} ${photo.taken_at}`}
                            className="h-full w-full rounded object-cover"
                          />
                        ) : (
                          "写真"
                        )}
                      </div>
                      <p className="mt-1 text-center text-xs text-muted-foreground">
                        {new Date(photo.taken_at).toLocaleDateString("ja-JP")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
