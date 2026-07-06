import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { getCachedSuccessStories } from "@/lib/server/site-content";
import SuccessStoryModal from "@/components/landing/SuccessStoryModal";
import { getWatermarkedCloudinaryUrl } from "@/lib/utils/image";

export const metadata: Metadata = {
  title: "Success Stories - Vivah Bandhan",
  description: "Read inspiring success stories from couples who found their perfect match on Vivah Bandhan.",
};

export default async function SuccessStoriesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const { successStories, successStoriesUnavailable } = await getCachedSuccessStories();

  const currentPage = Number(searchParams.page) || 1;
  const itemsPerPage = 8;
  const totalPages = Math.ceil((successStories?.length || 0) / itemsPerPage);
  
  const currentStories = successStories?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];

  return (
    <main className="min-h-screen bg-slate-50 pt-8 pb-16">
      <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <h1 className="flex items-center gap-3 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
              <Heart className="h-8 w-8 text-rose-500" />
              Success Stories
            </h1>
            <p className="mt-3 text-lg text-slate-600 max-w-2xl">
              Discover inspiring stories of couples who met on our platform and found their perfect life partners.
            </p>
          </div>
        </div>

        {successStoriesUnavailable && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
            Success stories are temporarily unavailable. Please try again later.
          </div>
        )}

        {!successStoriesUnavailable && successStories.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 px-4 text-center shadow-sm">
            <Heart className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No stories yet</h3>
            <p className="mt-1 text-slate-500">
              Check back soon for inspiring success stories from our members.
            </p>
          </div>
        )}

        {!successStoriesUnavailable && successStories.length > 0 && (
          <div className="space-y-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {currentStories.map((story: any) => (
                <SuccessStoryModal key={story.id} story={story}>
                  <article
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full shrink-0 bg-rose-50 overflow-hidden">
                      {story.images && story.images.length > 0 ? (
                        <Image
                          src={getWatermarkedCloudinaryUrl(story.images[0])}
                          alt={story.coupleName}
                          fill
                          draggable={false}
                          className="object-cover transition-transform duration-300 group-hover:scale-105 select-none pointer-events-none"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-rose-200">
                          <Heart className="h-12 w-12 opacity-50" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-xl font-bold text-slate-900 line-clamp-1">
                          {story.coupleName}
                        </h3>
                        {story.date && (
                          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                            {new Date(story.date).toLocaleDateString(undefined, {
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 italic">
                        "{story.review}"
                      </p>
                      {story.description && (
                        <p className="mt-4 text-sm text-slate-500 line-clamp-3">
                          {story.description}
                        </p>
                      )}
                    </div>
                  </article>
                </SuccessStoryModal>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {currentPage > 1 && (
                  <Link
                    href={`/success-stories?page=${currentPage - 1}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Link>
                )}
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Link
                      key={page}
                      href={`/success-stories?page=${page}`}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "border-rose-500 bg-rose-50 text-rose-600"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                      }`}
                    >
                      {page}
                    </Link>
                  ))}
                </div>

                {currentPage < totalPages && (
                  <Link
                    href={`/success-stories?page=${currentPage + 1}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
