"use client";

import React, { useEffect, useState } from "react";
import {
  BriefingRecord,
  UserPreferences,
  CustomTopicRecord,
  TrackId,
  DetailDensity,
  DispatchRunResult,
} from "@/types/intelligence";
import { DEFAULT_CORE_TRACKS } from "@/config/constants";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Database,
  ExternalLink,
  Film,
  Music,
  Plus,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  BookOpen,
} from "lucide-react";

export default function DashboardPage() {
  const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [selectedBriefing, setSelectedBriefing] = useState<BriefingRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"briefings" | "tracks" | "resolver" | "storage">("briefings");
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<DispatchRunResult | null>(null);

  // Dynamic Topic Resolver State
  const [resolvePrompt, setResolvePrompt] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedCandidate, setResolvedCandidate] = useState<{
    prompt: string;
    resolvedName: string;
    resolvedDescription: string;
    sourceUrl: string;
    sourceType: "rss" | "custom_api" | "github" | "tmdb" | "spotify";
    confidence: "high" | "medium";
  } | null>(null);

  // Status message banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [briefingsRes, prefsRes] = await Promise.all([
        fetch("/api/briefings"),
        fetch("/api/settings"),
      ]);

      if (briefingsRes.ok) {
        const bData = await briefingsRes.json();
        setBriefings(bData.briefings || []);
        if (bData.briefings && bData.briefings.length > 0 && !selectedBriefing) {
          setSelectedBriefing(bData.briefings[0]);
        }
      }

      if (prefsRes.ok) {
        const pData = await prefsRes.json();
        setPreferences(pData);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerImmediateDispatch = async () => {
    setIsDispatching(true);
    setDispatchResult(null);
    try {
      // Determine user's preferred density
      const hasInDepth = preferences && Object.values(preferences.trackDensities).some((d) => d === "in-depth");
      const targetDensity: DetailDensity = hasInDepth ? "in-depth" : "compact";

      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ density: targetDensity }),
      });
      const data = (await res.json()) as DispatchRunResult;
      setDispatchResult(data);
      if (data.success) {
        showToast("Today's digest was dispatched to your inbox!");
        await loadData();
      } else {
        showToast(`Dispatch note: ${data.error || "Completed"}`);
      }
    } catch (err) {
      showToast("Dispatch request failed.");
    } finally {
      setIsDispatching(false);
    }
  };

  const toggleTrack = async (trackId: TrackId, enabled: boolean) => {
    if (!preferences) return;
    const updatedTracks = { ...preferences.activeTracks, [trackId]: enabled };
    setPreferences({ ...preferences, activeTracks: updatedTracks });

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTracks: updatedTracks }),
      });
      showToast(`Updated topic settings.`);
    } catch {
      showToast("Failed to save changes.");
    }
  };

  const changeDensity = async (trackId: TrackId, density: DetailDensity) => {
    if (!preferences) return;
    const updatedDensities = { ...preferences.trackDensities, [trackId]: density };
    setPreferences({ ...preferences, trackDensities: updatedDensities });

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackDensities: updatedDensities }),
      });
      showToast(`Set to ${density === "in-depth" ? "In-Depth" : "Compact"} mode.`);
    } catch {
      showToast("Failed to save density change.");
    }
  };

  const togglePause = async (paused: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, isPaused: paused });

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaused: paused }),
      });
      showToast(paused ? "Daily morning dispatch paused." : "Daily morning dispatch resumed.");
    } catch {
      showToast("Failed to update schedule.");
    }
  };

  const resolveCustomTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvePrompt.trim()) return;

    setIsResolving(true);
    setResolvedCandidate(null);

    try {
      const res = await fetch("/api/topics/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: resolvePrompt }),
      });

      if (!res.ok) throw new Error("Resolution failed");
      const data = await res.json();
      setResolvedCandidate(data.candidate);
    } catch (err) {
      showToast("Could not find a feed for this topic. Please try another query.");
    } finally {
      setIsResolving(false);
    }
  };

  const addResolvedTopic = async () => {
    if (!resolvedCandidate) return;

    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolvedCandidate),
      });

      if (!res.ok) throw new Error("Failed to add topic");
      showToast(`Added "${resolvedCandidate.resolvedName}" to your daily digest.`);
      setResolvedCandidate(null);
      setResolvePrompt("");
      await loadData();
    } catch (err) {
      showToast("Failed to add custom topic.");
    }
  };

  const deleteCustomTopic = async (id: string) => {
    try {
      await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      showToast("Custom topic removed.");
      await loadData();
    } catch {
      showToast("Failed to remove topic.");
    }
  };

  const getTrackIcon = (id: string) => {
    if (id === "tech-ecosystem") return <Code2 className="w-5 h-5 text-zinc-800" />;
    if (id === "entertainment-hub") return <Film className="w-5 h-5 text-zinc-800" />;
    if (id === "global-music") return <Music className="w-5 h-5 text-zinc-800" />;
    return <Sparkles className="w-5 h-5 text-zinc-800" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] text-zinc-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 border border-zinc-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modern Editorial Header */}
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-12 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center font-bold text-white text-sm">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-zinc-900">
                  Raava Digest
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                  Personal Edition
                </span>
              </div>
              <p className="text-xs text-zinc-500 hidden sm:block">
                Daily morning briefing on tech, movies & music
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => togglePause(!preferences?.isPaused)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border ${
                preferences?.isPaused
                  ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                  : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{preferences?.isPaused ? "Paused" : "Daily at 7:00 AM"}</span>
            </button>

            <button
              onClick={triggerImmediateDispatch}
              disabled={isDispatching}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm flex items-center gap-2 disabled:opacity-50 transition cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing Digest...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Today&apos;s Digest</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Understated Tab Navigation */}
      <nav className="border-b border-zinc-200 bg-white px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("briefings")}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === "briefings"
                ? "border-zinc-900 text-zinc-900 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Past Issues ({briefings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tracks")}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === "tracks"
                ? "border-zinc-900 text-zinc-900 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Topics & Reading Depth</span>
          </button>

          <button
            onClick={() => setActiveTab("resolver")}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === "resolver"
                ? "border-zinc-900 text-zinc-900 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Add Custom Feed</span>
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === "storage"
                ? "border-zinc-900 text-zinc-900 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Archive & Storage</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-10">
        {/* Dispatch Alert Banner */}
        {dispatchResult && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-4 ${
              dispatchResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {dispatchResult.success ? "Digest Sent Successfully" : "Dispatch Note"}
              </h4>
              <p className="text-xs text-zinc-600 mt-0.5">
                Curated {dispatchResult.itemCount || 0} highlights. Dispatched to{" "}
                <strong>{dispatchResult.dispatchedEmail || "your inbox"}</strong> in{" "}
                {((dispatchResult.durationMs || 0) / 1000).toFixed(1)}s.
              </p>
            </div>
            <button
              onClick={() => setDispatchResult(null)}
              className="text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: PAST ISSUES */}
        {activeTab === "briefings" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Issues List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Recent Issues
                </h3>
                <span className="text-xs text-zinc-400">7-day archive</span>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-zinc-400 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                  Loading your digests...
                </div>
              ) : briefings.length === 0 ? (
                <div className="p-8 bg-white border border-zinc-200 rounded-xl text-center shadow-sm">
                  <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-zinc-800">No issues recorded yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Click &quot;Send Today&apos;s Digest&quot; above to generate your first issue.
                  </p>
                </div>
              ) : (
                briefings.map((b) => {
                  const isSelected = selectedBriefing?.id === b.id;
                  const formattedDate = new Date(b.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBriefing(b)}
                      className={`p-4 rounded-xl border cursor-pointer transition text-left ${
                        isSelected
                          ? "bg-white border-zinc-900 shadow-sm ring-1 ring-zinc-900"
                          : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-zinc-900">{formattedDate}</span>
                        <span
                          className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                            b.density === "in-depth"
                              ? "bg-amber-50 text-amber-800 border border-amber-200/80"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {b.density === "in-depth" ? "In-Depth" : "Compact"}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-zinc-700 line-clamp-1">{b.subject}</h4>
                      <div className="flex items-center justify-between mt-2.5 text-[11px] text-zinc-500">
                        <span>{b.totalItems} highlights</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <Check className="w-3 h-3" />
                          Delivered
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Clean Reading Sheet */}
            <div className="lg:col-span-8">
              {selectedBriefing ? (
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <div>
                      <h2 className="text-base font-semibold text-zinc-900">
                        {selectedBriefing.subject}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Dispatched {new Date(selectedBriefing.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Rolling 7-day archive
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        selectedBriefing.density === "in-depth"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {selectedBriefing.density === "in-depth" ? "In-Depth Edition" : "Compact Edition"}
                    </span>
                  </div>

                  <div className="p-6 sm:p-10 overflow-auto max-h-[750px] bg-white">
                    <div
                      className="max-w-2xl mx-auto"
                      dangerouslySetInnerHTML={{ __html: selectedBriefing.htmlBody }}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center p-12 bg-white border border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-sm">
                  Select an issue on the left to read.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TOPICS & READING DEPTH */}
        {activeTab === "tracks" && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Topics & Reading Depth</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Customize which subjects appear in your morning digest and adjust their analysis depth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DEFAULT_CORE_TRACKS.map((track) => {
                const isEnabled = preferences?.activeTracks[track.id] ?? true;
                const density = preferences?.trackDensities[track.id] || "compact";

                return (
                  <div
                    key={track.id}
                    className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-xl bg-zinc-100 text-zinc-800">
                          {getTrackIcon(track.id)}
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => toggleTrack(track.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900"></div>
                        </label>
                      </div>

                      <h4 className="text-sm font-semibold text-zinc-900">{track.name}</h4>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{track.description}</p>

                      <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1.5">
                        <span className="text-[11px] font-semibold uppercase text-zinc-400">
                          Sources ({track.sources.length})
                        </span>
                        <ul className="text-xs text-zinc-600 space-y-1">
                          {track.sources.map((src) => (
                            <li key={src.id} className="flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                              <span className="truncate">{src.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100">
                      <span className="text-[11px] font-semibold uppercase text-zinc-400 block mb-2">
                        Reading Depth
                      </span>
                      <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-lg">
                        <button
                          onClick={() => changeDensity(track.id, "compact")}
                          className={`py-1.5 text-xs font-medium rounded-md transition ${
                            density === "compact"
                              ? "bg-white text-zinc-900 shadow-xs font-semibold"
                              : "text-zinc-600 hover:text-zinc-900"
                          }`}
                        >
                          Compact
                        </button>
                        <button
                          onClick={() => changeDensity(track.id, "in-depth")}
                          className={`py-1.5 text-xs font-medium rounded-md transition ${
                            density === "in-depth"
                              ? "bg-white text-zinc-900 shadow-xs font-semibold"
                              : "text-zinc-600 hover:text-zinc-900"
                          }`}
                        >
                          In-Depth
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2">
                        {density === "in-depth"
                          ? "Rich deep dive: 4–6 bullets with architecture, ratings & context."
                          : "Quick skim: 2 punchy bullet points per story."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Topics List */}
            {preferences?.customTopics && preferences.customTopics.length > 0 && (
              <div className="mt-8 pt-6 border-t border-zinc-200">
                <h4 className="text-sm font-semibold text-zinc-900 mb-3">
                  Your Custom Feeds ({preferences.customTopics.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preferences.customTopics.map((ct) => (
                    <div
                      key={ct.id}
                      className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-900">{ct.resolvedName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 uppercase font-medium">
                            {ct.sourceType}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                          {ct.resolvedDescription}
                        </p>
                        <a
                          href={ct.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-zinc-600 hover:underline flex items-center gap-1 mt-1 truncate"
                        >
                          <span className="truncate">{ct.sourceUrl}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                      <button
                        onClick={() => deleteCustomTopic(ct.id)}
                        className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADD CUSTOM FEED */}
        {activeTab === "resolver" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center pb-2">
              <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">Add Any Topic or RSS Feed</h3>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Enter any domain or custom interest prompt (e.g., &quot;Formula 1 Racing&quot;, &quot;Rust WebAssembly&quot;, &quot;Electric Aviation&quot;).
                The engine resolves the best feed and plugs it into your morning briefing.
              </p>
            </div>

            <form onSubmit={resolveCustomTopic} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Formula 1 Racing, Rust WebAssembly, Quantum Physics..."
                value={resolvePrompt}
                onChange={(e) => setResolvePrompt(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 shadow-sm"
              />
              <button
                type="submit"
                disabled={isResolving || !resolvePrompt.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isResolving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Find Feed</span>
                  </>
                )}
              </button>
            </form>

            {resolvedCandidate && (
              <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Feed Verified
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium uppercase">
                    {resolvedCandidate.sourceType}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-zinc-900">
                    {resolvedCandidate.resolvedName}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    {resolvedCandidate.resolvedDescription}
                  </p>
                  <p className="text-xs font-mono text-zinc-600 mt-2 bg-zinc-50 p-2 rounded-lg border border-zinc-200 break-all">
                    {resolvedCandidate.sourceUrl}
                  </p>
                </div>

                <button
                  onClick={addResolvedTopic}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Daily Morning Digest</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ARCHIVE & STORAGE */}
        {activeTab === "storage" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-100 text-zinc-800">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    7-Day Rolling Retention Window
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Automated maintenance keeps local storage featherlight permanently (&lt; 5 MB).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                  <span className="text-[11px] font-semibold uppercase text-zinc-400 block">
                    Retention Window
                  </span>
                  <span className="text-xl font-bold text-zinc-900 mt-1 block">7 Days</span>
                  <span className="text-[11px] text-zinc-500">Automatic rolling cutoff</span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                  <span className="text-[11px] font-semibold uppercase text-zinc-400 block">
                    Storage Footprint
                  </span>
                  <span className="text-xl font-bold text-zinc-900 mt-1 block">&lt; 3.0 MB</span>
                  <span className="text-[11px] text-zinc-500">SQLite native database</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-2">
                <p className="font-semibold text-zinc-900">
                  Zero Maintenance Protocol:
                </p>
                <ul className="list-disc list-inside space-y-1 text-zinc-500">
                  <li>Issues automatically purge after 168 hours (7 days).</li>
                  <li>Deduplication memory prevents seeing the exact same news story twice.</li>
                  <li>Single-user architecture with zero multi-tenant database overhead.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 py-4 px-6 text-center text-xs text-zinc-400">
        Raava Digest &bull; Built with Next.js, Node.js SQLite &amp; Gemini AI
      </footer>
    </div>
  );
}
