"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BodyPhoto } from "@/types/database";

export default function MemberPhotosPage() {
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("body_photos")
        .select("*")
        .eq("member_id", user.id)
        .order("taken_at", { ascending: true });

      if (data) setPhotos(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-4">読み込み中...</div>;

  const photosByType = (type: string) => photos.filter((p) => p.photo_type === type);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">体形変化</h1>
      <Tabs defaultValue="front">
        <TabsList className="w-full">
          <TabsTrigger value="front" className="flex-1">正面</TabsTrigger>
          <TabsTrigger value="side" className="flex-1">側面</TabsTrigger>
          <TabsTrigger value="back" className="flex-1">背面</TabsTrigger>
        </TabsList>
        {(["front", "side", "back"] as const).map((type) => (
          <TabsContent key={type} value={type}>
            {photosByType(type).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  写真はまだありません
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photosByType(type).map((photo) => (
                  <Card key={photo.id} className="overflow-hidden">
                    <div className="aspect-[3/4] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      {photo.thumbnail_url ? (
                        <img src={photo.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "写真"
                      )}
                    </div>
                    <p className="p-1 text-center text-xs text-muted-foreground">
                      {new Date(photo.taken_at).toLocaleDateString("ja-JP")}
                    </p>
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
