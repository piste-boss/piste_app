"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { BodyPhoto, PhotoType } from "@/types/database";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "正面",
  side: "側面",
  back: "背面",
};

export default function MemberPhotosPage() {
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<BodyPhoto | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  const photosByType = (type: PhotoType) =>
    photos.filter((p) => p.photo_type === type);

  // Group photos by month for timeline
  const getTimelineGroups = (type: PhotoType) => {
    const filtered = photosByType(type);
    const groups: Record<string, BodyPhoto[]> = {};
    for (const photo of filtered) {
      const date = new Date(photo.taken_at);
      const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(photo);
    }
    return groups;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">体形変化</h1>

      {photos.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {photos.length}枚の写真 ・ トレーナーが撮影した体形変化の記録です
        </p>
      )}

      <Tabs defaultValue="front">
        <TabsList className="w-full">
          {(["front", "side", "back"] as const).map((type) => (
            <TabsTrigger key={type} value={type} className="flex-1">
              {PHOTO_TYPE_LABELS[type]}
              {photosByType(type).length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {photosByType(type).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {(["front", "side", "back"] as const).map((type) => {
          const groups = getTimelineGroups(type);
          const groupEntries = Object.entries(groups);
          const typePhotos = photosByType(type);

          return (
            <TabsContent key={type} value={type}>
              {typePhotos.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-2xl mb-2">📸</p>
                    <p className="text-muted-foreground">
                      {PHOTO_TYPE_LABELS[type]}の写真はまだありません
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      トレーナーがセッション時に撮影します
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Timeline horizontal scroll */}
                  {typePhotos.length >= 2 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          変化タイムライン
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {typePhotos.map((photo, index) => {
                            const date = new Date(photo.taken_at);
                            const label = index === 0 ? "入会時" : `${index}ヶ月`;
                            return (
                              <button
                                key={photo.id}
                                className="flex flex-col items-center flex-shrink-0"
                                onClick={() => setSelectedPhoto(photo)}
                              >
                                <div className="w-20 aspect-[3/4] rounded-lg bg-muted overflow-hidden border transition-shadow hover:shadow-md">
                                  {photo.thumbnail_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={photo.thumbnail_url}
                                      alt={`${PHOTO_TYPE_LABELS[type]} ${date.toLocaleDateString("ja-JP")}`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                                      写真
                                    </div>
                                  )}
                                </div>
                                <span className="mt-1 text-xs font-medium">
                                  {label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {date.toLocaleDateString("ja-JP", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Grid by month */}
                  {groupEntries.map(([month, monthPhotos]) => (
                    <div key={month}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {month}
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {monthPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            className="text-left"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
                              <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                                {photo.thumbnail_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={photo.thumbnail_url}
                                    alt={`${PHOTO_TYPE_LABELS[type]}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    写真
                                  </span>
                                )}
                              </div>
                              <CardContent className="p-1.5">
                                <p className="text-center text-xs text-muted-foreground">
                                  {new Date(photo.taken_at).toLocaleDateString(
                                    "ja-JP"
                                  )}
                                </p>
                              </CardContent>
                            </Card>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Full-size photo dialog */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={(open) => { if (!open) setSelectedPhoto(null); }}
      >
        <DialogContent className="max-w-lg p-2">
          {selectedPhoto && (
            <div>
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                {selectedPhoto.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedPhoto.thumbnail_url.replace(/sz=w\d+/, "sz=w800")}
                    alt={`${PHOTO_TYPE_LABELS[selectedPhoto.photo_type]}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    写真を表示できません
                  </div>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">
                  {PHOTO_TYPE_LABELS[selectedPhoto.photo_type]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedPhoto.taken_at).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
