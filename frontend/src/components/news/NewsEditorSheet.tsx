import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api-client";
import { API_URL } from "../../config";
import type { NewsPost } from "../../types";

interface NewsEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: NewsPost | null;
  onSave: () => void;
}

export function NewsEditorSheet({
  open,
  onOpenChange,
  post,
  onSave,
}: NewsEditorSheetProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    coverImage: "",
    isPublished: false,
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || "",
        coverImage: post.coverImage || "",
        isPublished: post.isPublished,
      });
    } else {
      setFormData({
        title: "",
        content: "",
        excerpt: "",
        coverImage: "",
        isPublished: false,
      });
    }
  }, [post, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = post ? `${API_URL}/news/${post.id}` : `${API_URL}/news`;
      const method = post ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(
          post ? "Hír sikeresen frissítve" : "Hír sikeresen létrehozva",
        );
        onSave();
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error?.message || "Hiba történt a mentés során");
      }
    } catch (error) {
      console.error("News save error:", error);
      toast.error("Váratlan hiba történt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto bg-[#1a1b26] border-l border-white/10 text-white">
        <SheetHeader>
          <SheetTitle className="text-white">
            {post ? "Hír szerkesztése" : "Új hír létrehozása"}
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            {post
              ? "Módosítsd a hír részleteit az alábbi űrlapon."
              : "Töltsd ki az űrlapot az új hír publikálásához."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="text-sm font-medium text-gray-200"
            >
              Cím
            </label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Add meg a hír címét"
              className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 focus:border-primary/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="excerpt"
              className="text-sm font-medium text-gray-200"
            >
              Rövid leírás (Kivonat)
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="Rövid összefoglaló, ami megjelenik a listában..."
              className="flex min-h-[80px] w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="content"
              className="text-sm font-medium text-gray-200"
            >
              Tartalom (Markdown)
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="A hír tartalma Markdown formátumban..."
              className="flex min-h-[300px] w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              required
            />
            <p className="text-xs text-gray-500">
              Tipp: Használj Markdown-t a formázáshoz. (**félkövér**, # címsor,
              stb.)
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="coverImage"
              className="text-sm font-medium text-gray-200"
            >
              Borítókép URL
            </label>
            <Input
              id="coverImage"
              name="coverImage"
              value={formData.coverImage}
              onChange={handleChange}
              placeholder="https://..."
              className="bg-black/20 border-white/10 text-white placeholder:text-gray-500 focus:border-primary/50"
            />
            {formData.coverImage && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 h-32 w-full">
                <img
                  src={formData.coverImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isPublished"
              name="isPublished"
              checked={formData.isPublished}
              onChange={handleCheckboxChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-black/20 border-white/10"
            />
            <label
              htmlFor="isPublished"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-200"
            >
              Publikálva (látható a felhasználóknak)
            </label>
          </div>

          <SheetFooter className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="mr-2 border-white/10 text-gray-300 hover:bg-white/5 hover:text-white bg-transparent"
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {loading ? "Mentés..." : post ? "Mentés" : "Létrehozás"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
