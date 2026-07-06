import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import MultiImageUpload from "@/components/common/MultiImageUpload";

type SuccessStory = {
  id: string;
  coupleName: string;
  review: string;
  description: string | null;
  date: string | null;
  images: string[];
};

type SuccessStoryFormProps = {
  story: SuccessStory | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function SuccessStoryForm({ story, onClose, onSuccess }: SuccessStoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    coupleName: story?.coupleName || "",
    review: story?.review || "",
    description: story?.description || "",
    date: story?.date ? new Date(story.date).toISOString().split("T")[0] : "",
    images: story?.images || [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (newImages: string[]) => {
    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.coupleName || !formData.review) {
      setError("Couple Name and Review are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = story ? `/api/admin/success-stories/${story.id}` : "/api/admin/success-stories";
      const method = story ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: formData.date ? new Date(formData.date).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-display text-xl font-bold text-gray-900">
            {story ? "Edit Success Story" : "Add Success Story"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="success-story-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="coupleName" className="block text-sm font-medium text-gray-700">
                Couple's Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="coupleName"
                name="coupleName"
                value={formData.coupleName}
                onChange={handleChange}
                placeholder="e.g. Arun & Divya"
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Wedding / Engagement Date (Optional)
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <MultiImageUpload
                label="Photos"
                helperText="Upload photos of the couple. Max 4 images."
                values={formData.images}
                onChange={handleImagesChange}
                maxFiles={4}
              />
            </div>

            <div>
              <label htmlFor="review" className="block text-sm font-medium text-gray-700">
                Review / Testimonial <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="review"
                name="review"
                rows={4}
                value={formData.review}
                onChange={handleChange}
                placeholder="Write their testimonial..."
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Short Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief summary..."
                className="mt-2 block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="success-story-form"
            disabled={isSubmitting}
            className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Story"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
