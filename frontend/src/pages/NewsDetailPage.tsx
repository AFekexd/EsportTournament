import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api-client";
import { API_URL } from "../config";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { ArrowLeft, Calendar, User, Share2, Edit } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { NewsEditorSheet } from "../components/news/NewsEditorSheet";
import type { NewsPost } from "../types";

export function NewsDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const isAdminOrOrganizer =
    user?.role === "ADMIN" || user?.role === "ORGANIZER";

  const fetchPost = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/news/${slug}`);
      const data = await res.json();

      if (data.success) {
        setPost(data.data);
      } else {
        toast.error("A kért cikk nem található");
        navigate("/news");
      }
    } catch (error) {
      console.error("Failed to fetch news post", error);
      toast.error("Hiba a cikk betöltésekor");
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link másolva a vágólapra!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="animate-fade-in pb-20">
      {/* Header / Cover */}
      <div className="relative h-[400px] md:h-[500px] w-full bg-black/50">
        {post.coverImage && (
          <>
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1016] via-transparent to-black/30"></div>
          </>
        )}

        {/* Status Badge for Unpublished */}
        {!post.isPublished && (
          <div className="absolute top-24 left-6 md:left-auto md:right-6 z-20 bg-yellow-500/80 backdrop-blur-md text-black px-3 py-1.5 rounded-lg text-sm font-bold uppercase shadow-lg">
            Piszkozat (Nem publikus)
          </div>
        )}

        <div className="absolute inset-0 container mx-auto px-6 max-w-4xl flex flex-col justify-end pb-12">
          <div className="flex justify-between items-start mb-6">
            <Link
              to="/news"
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors backdrop-blur-sm bg-black/30 px-3 py-1.5 rounded-lg w-fit"
            >
              <ArrowLeft size={16} /> Vissza a hírekhez
            </Link>

            {isAdminOrOrganizer && (
              <Button
                onClick={() => setIsEditorOpen(true)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10"
              >
                <Edit size={16} className="mr-2" />
                Szerkesztés
              </Button>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-xl">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/20">
                {post.author.avatarUrl ? (
                  <img
                    src={post.author.avatarUrl}
                    alt={post.author.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                    <User size={14} />
                  </div>
                )}
              </div>
              <span className="font-medium">
                {post.author.displayName || post.author.username}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <span>
                {format(new Date(post.createdAt), "yyyy. MM. dd.", {
                  locale: hu,
                })}
              </span>
            </div>

            <button
              onClick={handleShare}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Megosztás</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 max-w-4xl mt-12">
        <div className="prose prose-invert prose-lg max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </div>

      <NewsEditorSheet
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        post={post}
        onSave={fetchPost}
      />
    </div>
  );
}
