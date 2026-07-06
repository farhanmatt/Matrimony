"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Heart, Search, ChevronLeft, ChevronRight } from "lucide-react";
import SuccessStoryForm from "./SuccessStoryForm";

type SuccessStory = {
  id: string;
  coupleName: string;
  review: string;
  description: string | null;
  date: string | null;
  images: string[];
};

export default function SuccessStoriesClient() {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<SuccessStory | null>(null);

  // Search and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/success-stories");
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error("Failed to fetch stories", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this success story?")) return;
    
    try {
      const res = await fetch(`/api/admin/success-stories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchStories();
      } else {
        alert("Failed to delete story.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete story.");
    }
  };

  // Filter stories based on search query
  const filteredStories = useMemo(() => {
    if (!searchQuery.trim()) return stories;
    const lowerQuery = searchQuery.toLowerCase();
    return stories.filter(
      (story) =>
        story.coupleName.toLowerCase().includes(lowerQuery) ||
        story.review.toLowerCase().includes(lowerQuery) ||
        (story.description && story.description.toLowerCase().includes(lowerQuery))
    );
  }, [stories, searchQuery]);

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStories.length / itemsPerPage);
  const currentStories = filteredStories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Top Bar: Search and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search stories by name or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <button
          onClick={() => {
            setEditingStory(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Success Story
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600"></div>
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-500">
            <Heart className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-gray-900">No stories found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchQuery ? "Try adjusting your search query." : "Add your first success story to show them on the landing page."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid Layout: 4 cards per row on large screens */}
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {currentStories.map((story) => (
              <div
                key={story.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-rose-200"
              >
                {/* Image Section - reduced aspect ratio for compactness */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                  {story.images && story.images.length > 0 ? (
                    <img
                      src={story.images[0]}
                      alt={story.coupleName}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-rose-50 text-rose-300">
                      <Heart className="h-10 w-10 opacity-50" />
                    </div>
                  )}
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <button
                        onClick={() => {
                          setEditingStory(story);
                          setIsFormOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-700 backdrop-blur-sm transition-colors hover:bg-white hover:text-rose-600 shadow-sm"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(story.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-700 backdrop-blur-sm transition-colors hover:bg-rose-500 hover:text-white shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Content Section - smaller padding and text for compactness */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display text-base font-bold text-gray-900 line-clamp-1">{story.coupleName}</h3>
                  </div>
                  
                  {story.date && (
                    <div className="mb-2 text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider">
                      {new Date(story.date).toLocaleDateString()}
                    </div>
                  )}
                  
                  <p className="line-clamp-3 flex-1 text-xs text-gray-600 italic">"{story.review}"</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-medium text-gray-900">
                  {Math.min(currentPage * itemsPerPage, filteredStories.length)}
                </span>{" "}
                of <span className="font-medium text-gray-900">{filteredStories.length}</span> results
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "border-rose-500 bg-rose-50 text-rose-600"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isFormOpen && (
        <SuccessStoryForm
          story={editingStory}
          onClose={() => {
            setIsFormOpen(false);
            setEditingStory(null);
          }}
          onSuccess={() => {
            setIsFormOpen(false);
            setEditingStory(null);
            fetchStories();
          }}
        />
      )}
    </div>
  );
}
