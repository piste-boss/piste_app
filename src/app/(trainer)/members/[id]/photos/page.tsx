"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BodyPhoto, PhotoType } from "@/types/database";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "正面",
  side: "側面",
  back: "背面",
};

export default function TrainerMemberPhotosPage() {
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<PhotoType>("front");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: user }, { data: photoData }] = await Promise.all([
      supabase
        .from("users")
        .select("last_name, first_name")
        .eq("id", memberId)
        .single(),
      supabase
        .from("body_photos")
        .select("*")
        .eq("member_id", memberId)
        .order("taken_at", { ascending: true }),
    ]);
    if (user) setMemberName(`${user.last_name} ${user.first_name}`);
    if (photoData) setPhotos(photoData);
    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileSelected = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("画像ファイルを選択してください");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("ファイルサイズは10MB以下にしてください");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("memberId", memberId);
      formData.append("photoType", selectedPhotoType);
      formData.append("takenAt", new Date().toISOString());

      const res = await fetch("/api/google-drive/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "アップロードに失敗しました");
      }

      setShowUploadDialog(false);
      setPreviewImage(null);
      await loadData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    handleFileSelected(file);
  };

  const openUploadDialog = () => {
    setUploadError(null);
    setPreviewImage(null);
    setShowUploadDialog(true);
  };

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
      <div className="space-y-4 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{memberName} 様 - 体形変化</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {photos.length > 0
              ? `${photos.length}枚の写真を管理中`
              : "まだ写真がありません"}
          </p>
        </div>
        <Button onClick={openUploadDialog}>新しい写真を撮影</Button>
      </div>

      {/* Photo Timeline by Type */}
      <Tabs defaultValue="front">
        <TabsList className="w-full">
          <TabsTrigger value="front" className="flex-1">
            正面
            {photosByType("front").length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {photosByType("front").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="side" className="flex-1">
            側面
            {photosByType("side").length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {photosByType("side").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="back" className="flex-1">
            背面
            {photosByType("back").length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {photosByType("back").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {(["front", "side", "back"] as const).map((type) => {
          const groups = getTimelineGroups(type);
          const groupEntries = Object.entries(groups);

          return (
            <TabsContent key={type} value={type}>
              {groupEntries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      {PHOTO_TYPE_LABELS[type]}の写真はまだありません
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPhotoType(type);
                        openUploadDialog();
                      }}
                    >
                      {PHOTO_TYPE_LABELS[type]}写真を撮影
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Timeline horizontal scroll */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">変化タイムライン</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {photosByType(type).map((photo, index) => {
                          const date = new Date(photo.taken_at);
                          const label =
                            index === 0
                              ? "入会時"
                              : `${index}ヶ月`;
                          return (
                            <div
                              key={photo.id}
                              className="flex flex-col items-center flex-shrink-0"
                            >
                              <div className="w-24 aspect-[3/4] rounded-lg bg-muted overflow-hidden border">
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
                              <span className="mt-1 text-xs font-medium">{label}</span>
                              <span className="text-xs text-muted-foreground">
                                {date.toLocaleDateString("ja-JP", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              {index < photosByType(type).length - 1 && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly groups */}
                  {groupEntries.map(([month, monthPhotos]) => (
                    <div key={month}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {month}
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {monthPhotos.map((photo) => (
                          <Card key={photo.id} className="overflow-hidden">
                            <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                              {photo.thumbnail_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={photo.thumbnail_url}
                                  alt={`${PHOTO_TYPE_LABELS[type]} ${new Date(photo.taken_at).toLocaleDateString("ja-JP")}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  写真
                                </span>
                              )}
                            </div>
                            <CardContent className="p-2">
                              <p className="text-center text-xs text-muted-foreground">
                                {new Date(photo.taken_at).toLocaleDateString("ja-JP")}
                              </p>
                            </CardContent>
                          </Card>
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

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>写真をアップロード</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo type selection */}
            <div>
              <label className="block text-sm font-medium mb-2">撮影部位</label>
              <div className="flex gap-2">
                {(["front", "side", "back"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={selectedPhotoType === type ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedPhotoType(type)}
                  >
                    {PHOTO_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {previewImage && (
              <div className="aspect-[3/4] max-h-64 mx-auto overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage}
                  alt="プレビュー"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Upload buttons */}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "アップロード中..." : "カメラで撮影"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                ファイルを選択
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleInputChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />

            {/* Error message */}
            {uploadError && (
              <p className="text-sm text-red-600 text-center">{uploadError}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
