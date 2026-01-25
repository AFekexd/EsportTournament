import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api-client";
import { API_URL } from "../config";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Calendar, Newspaper, User, Plus, Edit, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { NewsEditorSheet } from "../components/news/NewsEditorSheet";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import { toast } from "sonner";
import type { NewsPost } from "../types";

export function NewsPage() {
  const { user } = useAuth();
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    postId: string | null;
  }>({
    isOpen: false,
    postId: null,
  });

  const isAdminOrOrganizer =
    user?.role === "ADMIN" || user?.role === "ORGANIZER";

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/news`);
      const data = await res.json();
      if (data.success) {
        setNews(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch news", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleCreate = () => {
    setEditingPost(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, post: NewsPost) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingPost(post);
    setIsEditorOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmModal({ isOpen: true, postId });
  };

  const confirmDelete = async () => {
    if (!confirmModal.postId) return;

    try {
      const res = await apiFetch(`${API_URL}/news/${confirmModal.postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Hír törölve");
        fetchNews();
      } else {
        toast.error("Hiba a törlés során");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Váratlan hiba történt");
    } finally {
      setConfirmModal({ isOpen: false, postId: null });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <Newspaper className="text-primary" size={32} />
            Hírek és Blog
          </h1>
          <p className="text-muted-foreground">
            A legfrissebb hírek a versenyekről
          </p>
        </div>

        {isAdminOrOrganizer && (
          <Button
            onClick={handleCreate}
            className="bg-primary hover:bg-primary/90 text-white gap-2"
          >
            <Plus size={18} />
            Új hír
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
          <Newspaper size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">Nincsenek hírek</h3>
          <p className="text-gray-600 mt-2">
            Nézz vissza később a legfrissebb információkért!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((post) => (
            <Link
              key={post.id}
              to={`/news/${post.slug}`}
              className="group bg-[#161722] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col h-full relative"
            >
              {/* Status Badge for Unpublished */}
              {!post.isPublished && (
                <div className="absolute top-4 left-4 z-10 bg-yellow-500/80 backdrop-blur-md text-black px-2 py-1 rounded text-xs font-bold uppercase">
                  Piszkozat
                </div>
              )}

              {/* Cover Image */}
              <div className="h-48 bg-black/40 relative overflow-hidden">
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent">
                    <Newspaper size={40} className="text-white/10" />
                  </div>
                )}

                {/* Date Badge */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar size={12} className="text-primary" />
                  {format(new Date(post.createdAt), "yyyy. MM. dd.", {
                    locale: hu,
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <h2 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}

                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                      {post.author.avatarUrl ? (
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                    <div className="text-xs">
                      <div className="text-white font-medium">
                        {post.author.displayName || post.author.username}
                      </div>
                    </div>
                  </div>

                  {isAdminOrOrganizer && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        onClick={(e) => handleEdit(e, post)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                        onClick={(e) => handleDeleteClick(e, post.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewsEditorSheet
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        post={editingPost}
        onSave={fetchNews}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, postId: null })}
        onConfirm={confirmDelete}
        title="Hír törlése"
        message="Biztosan törölni szeretnéd ezt a hírt? Ez a művelet nem visszavonható."
        variant="danger"
        confirmLabel="Törlés"
      />
    </div>
  );
}
