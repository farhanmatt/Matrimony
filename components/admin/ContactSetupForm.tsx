"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";

export default function ContactSetupForm() {
  const [officialEmail, setOfficialEmail] = useState("");
  const [doorNumber, setDoorNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [roadName, setRoadName] = useState("");
  const [areaLocality, setAreaLocality] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/settings");
        if (!response.ok) throw new Error("Failed to load settings");
        const data = await response.json();
        if (data.settings) {
          if (data.settings.officialEmail) setOfficialEmail(data.settings.officialEmail);
          if (data.settings.doorNumber) setDoorNumber(data.settings.doorNumber);
          if (data.settings.streetName) setStreetName(data.settings.streetName);
          if (data.settings.roadName) setRoadName(data.settings.roadName);
          if (data.settings.areaLocality) setAreaLocality(data.settings.areaLocality);
          if (data.settings.city) setCity(data.settings.city);
          if (data.settings.district) setDistrict(data.settings.district);
          if (data.settings.state) setState(data.settings.state);
          if (data.settings.pincode) setPincode(data.settings.pincode);
          if (data.settings.country) setCountry(data.settings.country);
        }
      } catch (error) {
        toast.error("Could not load Gmail setup data.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialEmail.trim()) {
      toast.error("Email address is required.");
      return;
    }
    
    // Basic regex for email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialEmail: officialEmail.trim(),
          doorNumber: doorNumber.trim() || null,
          streetName: streetName.trim() || null,
          roadName: roadName.trim() || null,
          areaLocality: areaLocality.trim() || null,
          city: city.trim() || null,
          district: district.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          country: country.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      toast.success("Contact settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="officialEmail" className="text-sm font-semibold text-gray-700">
            Official Gmail Address <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              id="officialEmail"
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
              placeholder="support@fmlpmatrimony.com"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
              required
            />
          </div>
          <p className="text-[11px] text-gray-500 italic">
            This email will be displayed on the Landing Page, Help section, and across the platform.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Address Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="doorNumber" className="text-sm font-semibold text-gray-700">
              Door Number
            </label>
            <input
              type="text"
              id="doorNumber"
              value={doorNumber}
              onChange={(e) => setDoorNumber(e.target.value)}
              placeholder="e.g. 12"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="streetName" className="text-sm font-semibold text-gray-700">
              Street Name
            </label>
            <input
              type="text"
              id="streetName"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              placeholder="e.g. Anna Street"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="roadName" className="text-sm font-semibold text-gray-700">
              Road Name
            </label>
            <input
              type="text"
              id="roadName"
              value={roadName}
              onChange={(e) => setRoadName(e.target.value)}
              placeholder="e.g. Main Road"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="areaLocality" className="text-sm font-semibold text-gray-700">
              Area / Locality
            </label>
            <input
              type="text"
              id="areaLocality"
              value={areaLocality}
              onChange={(e) => setAreaLocality(e.target.value)}
              placeholder="e.g. T. Nagar"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-semibold text-gray-700">
              City
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Chennai"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="district" className="text-sm font-semibold text-gray-700">
              District
            </label>
            <input
              type="text"
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Chennai District"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="state" className="text-sm font-semibold text-gray-700">
              State
            </label>
            <input
              type="text"
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Tamil Nadu"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pincode" className="text-sm font-semibold text-gray-700">
              PIN / ZIP Code
            </label>
            <input
              type="text"
              id="pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="e.g. 600017"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="country" className="text-sm font-semibold text-gray-700">
              Country
            </label>
            <input
              type="text"
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-rose-50 pt-6">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:grayscale"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
