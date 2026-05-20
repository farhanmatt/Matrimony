"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { MOTHER_TONGUE_OPTIONS } from "@/lib/constants/languages";
import {
  preferenceSchema,
  type PreferenceInput,
} from "@/lib/validations/profile";
import { MARITAL_STATUS_LABELS } from "@/lib/utils/helpers";

const religionOptions = [
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Jain",
  "Buddhist",
  "Parsi",
  "Other",
];

const emptyPreference: PreferenceInput = {
  ageMin: null,
  ageMax: null,
  heightMin: null,
  heightMax: null,
  religion: null,
  caste: null,
  education: null,
  profession: null,
  location: null,
  maritalStatus: null,
  language: null,
};

function toOptionalNumber(value: unknown) {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function emptyToNull(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function PreferenceForm({
  defaultValues,
}: {
  defaultValues?: Partial<PreferenceInput>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PreferenceInput>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: { ...emptyPreference, ...defaultValues },
  });

  useEffect(() => {
    reset({ ...emptyPreference, ...defaultValues });
  }, [defaultValues, reset]);

  const onSubmit = async (data: PreferenceInput) => {
    const res = await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to save preferences");
      return;
    }

    toast.success("Preferences saved successfully!");
    reset({ ...emptyPreference, ...json.preference });
  };

  const inputClass =
    "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-rose-500 text-xs mt-1";
  const selectedLanguage = watch("language");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 flex gap-3 text-sm text-rose-800">
        <div className="w-10 h-10 rounded-xl bg-white text-rose-500 flex items-center justify-center shrink-0 shadow-sm">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Improve your match suggestions</p>
          <p className="mt-1 text-rose-700">
            Add the partner details that matter most to you. You can keep any
            field blank if you are open to all options.
          </p>
        </div>
      </div>

      <section>
        <h2 className="text-base font-display font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5">
          Basic Preferences
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass} htmlFor="pref-age-min">
              Minimum Age
            </label>
            <input
              id="pref-age-min"
              type="number"
              min={18}
              max={100}
              {...register("ageMin", { setValueAs: toOptionalNumber })}
              className={inputClass}
              placeholder="24"
            />
            {errors.ageMin && <p className={errorClass}>{errors.ageMin.message}</p>}
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-age-max">
              Maximum Age
            </label>
            <input
              id="pref-age-max"
              type="number"
              min={18}
              max={100}
              {...register("ageMax", { setValueAs: toOptionalNumber })}
              className={inputClass}
              placeholder="32"
            />
            {errors.ageMax && <p className={errorClass}>{errors.ageMax.message}</p>}
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-height-min">
              Minimum Height (cm)
            </label>
            <input
              id="pref-height-min"
              type="number"
              min={100}
              max={250}
              {...register("heightMin", { setValueAs: toOptionalNumber })}
              className={inputClass}
              placeholder="155"
            />
            {errors.heightMin && <p className={errorClass}>{errors.heightMin.message}</p>}
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-height-max">
              Maximum Height (cm)
            </label>
            <input
              id="pref-height-max"
              type="number"
              min={100}
              max={250}
              {...register("heightMax", { setValueAs: toOptionalNumber })}
              className={inputClass}
              placeholder="185"
            />
            {errors.heightMax && <p className={errorClass}>{errors.heightMax.message}</p>}
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-marital-status">
              Marital Status
            </label>
            <select
              id="pref-marital-status"
              {...register("maritalStatus", { setValueAs: emptyToNull })}
              className={inputClass}
            >
              <option value="">Any</option>
              {Object.entries(MARITAL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-location">
              Preferred Location
            </label>
            <input
              id="pref-location"
              type="text"
              {...register("location", { setValueAs: emptyToNull })}
              className={inputClass}
              placeholder="City, state, or country"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-display font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5">
          Community & Lifestyle
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass} htmlFor="pref-religion">
              Religion
            </label>
            <select
              id="pref-religion"
              {...register("religion", { setValueAs: emptyToNull })}
              className={inputClass}
            >
              <option value="">Any</option>
              {religionOptions.map((religion) => (
                <option key={religion} value={religion}>
                  {religion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-caste">
              Caste
            </label>
            <input
              id="pref-caste"
              type="text"
              {...register("caste", { setValueAs: emptyToNull })}
              className={inputClass}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-language">
              Mother Tongue
            </label>
            <select
              id="pref-language"
              {...register("language", { setValueAs: emptyToNull })}
              className={inputClass}
            >
              <option value="">Any</option>
              {selectedLanguage &&
              !MOTHER_TONGUE_OPTIONS.some(
                (option) => option.value === selectedLanguage
              ) ? (
                <option value={selectedLanguage}>{selectedLanguage}</option>
              ) : null}
              {MOTHER_TONGUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-education">
              Education
            </label>
            <input
              id="pref-education"
              type="text"
              {...register("education", { setValueAs: emptyToNull })}
              className={inputClass}
              placeholder="Graduate, MBA, B.Tech..."
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="pref-profession">
              Profession
            </label>
            <input
              id="pref-profession"
              type="text"
              {...register("profession", { setValueAs: emptyToNull })}
              className={inputClass}
              placeholder="Doctor, engineer, business..."
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex items-center gap-2 py-3 px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" /> Save Preferences
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => reset(emptyPreference)}
          disabled={isSubmitting}
          className="btn-outline flex items-center gap-2 py-3 px-8"
        >
          <RotateCcw className="w-4 h-4" />
          Clear Form
        </button>
      </div>
    </form>
  );
}
