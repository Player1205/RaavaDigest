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
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  Film,
  Flame,
  Layers,
  Music,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  X,
  ExternalLink,
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
      const res = await fetch("/api/dispatch", { method: "POST" });
      const data = (await res.json()) as DispatchRunResult;
      setDispatchResult(data);
      if (data.success) {
        showToast("Immediate briefing dispatched successfully to inbox!");
        await loadData();
      } else {
        showToast(`Dispatch completed with note: ${data.error || "Unknown"}`);
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
      showToast(`Track "${trackId}" updated.`);
    } catch {
      showToast("Failed to save track update.");
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
      showToast(`Density updated to ${density} for "${trackId}".`);
    } catch {
      showToast("Failed to save density update.");
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
      showToast(paused ? "Daily scheduled delivery paused." : "Daily delivery resumed.");
    } catch {
      showToast("Failed to save pause setting.");
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
      showToast("Could not resolve topic. Please try another prompt.");
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
      showToast(`Added "${resolvedCandidate.resolvedName}" to active pipeline.`);
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
      showToast("Failed to remove custom topic.");
    }
  };

  const getTrackIcon = (id: string) => {
    if (id === "tech-ecosystem") return <Cpu className="w-5 h-5 text-indigo-400" />;
    if (id === "entertainment-hub") return <Film className="w-5 h-5 text-rose-400" />;
    if (id === "global-music") return <Music className="w-5 h-5 text-emerald-400" />;
    return <Sparkles className="w-5 h-5 text-cyan-400" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 border border-indigo-400/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20">
              PI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  Personal Intelligence Engine
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  SINGLE-USER V1
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Dedicated Daily Ingestion, Synthesis, & Delivery System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => togglePause(!preferences?.isPaused)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                preferences?.isPaused
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{preferences?.isPaused ? "Deliveries Paused" : "Active (7:00 AM)"}</span>
            </button>

            <button
              onClick={triggerImmediateDispatch}
              disabled={isDispatching}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 disabled:opacity-50 transition cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Trigger Immediate Dispatch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-slate-800/80 bg-slate-900/40 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-6 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("briefings")}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "briefings"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>7-Day Rolling Briefings ({briefings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tracks")}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "tracks"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Track & Density Controls</span>
          </button>

          <button
            onClick={() => setActiveTab("resolver")}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "resolver"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>AI Topic Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition ${
              activeTab === "storage"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Storage & TTL Policy</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* Dispatch Feedback Alert if triggered */}
        {dispatchResult && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-4 ${
              dispatchResult.success
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/40 border-rose-500/40 text-rose-200"
            }`}
          >
            <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {dispatchResult.success ? "Immediate Dispatch Completed" : "Dispatch Note"}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Generated {dispatchResult.itemCount || 0} highlights across active tracks. Dispatched to{" "}
                <strong>{dispatchResult.dispatchedEmail || "user inbox"}</strong> in{" "}
                {((dispatchResult.durationMs || 0) / 1000).toFixed(1)}s.
                {dispatchResult.purgedCount !== undefined &&
                  ` Cleaned up ${dispatchResult.purgedCount} expired records.`}
              </p>
            </div>
            <button
              onClick={() => setDispatchResult(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: 7-DAY ROLLING BRIEFINGS */}
        {activeTab === "briefings" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Briefings List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rolling 7-Day Window
                </h3>
                <span className="text-[11px] text-slate-500">Auto-purged after 7 days</span>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading briefings...
                </div>
              ) : briefings.length === 0 ? (
                <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                  <Flame className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-300">No briefings recorded yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &quot;Trigger Immediate Dispatch&quot; above to generate your first briefing.
                  </p>
                </div>
              ) : (
                briefings.map((b) => {
                  const isSelected = selectedBriefing?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBriefing(b)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "bg-indigo-950/30 border-indigo-500/50 shadow-md"
                          : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-sky-400">{b.date}</span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {b.density}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{b.subject}</h4>
                      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                        <span>{b.totalItems} Highlights</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {b.deliveredStatus}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Briefing Detail / HTML Preview */}
            <div className="lg:col-span-8">
              {selectedBriefing ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        Dispatched Briefing Preview
                      </span>
                      <h2 className="text-lg font-bold text-white mt-0.5">
                        {selectedBriefing.subject}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dispatched: {new Date(selectedBriefing.dispatchedAt).toLocaleString()} • Expires:{" "}
                        {new Date(selectedBriefing.retentionExpiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      7-Day Retained
                    </span>
                  </div>

                  <div className="p-4 sm:p-6 bg-slate-950/70 overflow-auto max-h-[700px]">
                    <div
                      className="prose prose-invert max-w-none text-slate-200"
                      dangerouslySetInnerHTML={{ __html: selectedBriefing.htmlBody }}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                  Select a past briefing on the left to inspect its synthesized payload.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TRACK & DENSITY CONTROLS */}
        {activeTab === "tracks" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Interest Tracks & Density Settings</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize which categories are included in daily briefings and their analysis depth.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DEFAULT_CORE_TRACKS.map((track) => {
                const isEnabled = preferences?.activeTracks[track.id] ?? true;
                const density = preferences?.trackDensities[track.id] || "compact";

                return (
                  <div
                    key={track.id}
                    className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700/80 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                          {getTrackIcon(track.id)}
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => toggleTrack(track.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <h4 className="text-sm font-bold text-white">{track.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{track.description}</p>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase text-slate-500">
                          Active Sources ({track.sources.length})
                        </span>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {track.sources.map((src) => (
                            <li key={src.id} className="flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                              <span className="truncate">{src.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800">
                      <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">
                        Reading Density
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => changeDensity(track.id, "compact")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            density === "compact"
                              ? "bg-indigo-600 text-white border-indigo-500"
                              : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
                          }`}
                        >
                          Compact
                        </button>
                        <button
                          onClick={() => changeDensity(track.id, "in-depth")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            density === "in-depth"
                              ? "bg-indigo-600 text-white border-indigo-500"
                              : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
                          }`}
                        >
                          In-Depth
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Topics List */}
            {preferences?.customTopics && preferences.customTopics.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-bold uppercase text-slate-400 mb-3">
                  Dynamic Custom Feeds ({preferences.customTopics.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preferences.customTopics.map((ct) => (
                    <div
                      key={ct.id}
                      className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sky-400">{ct.resolvedName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                            {ct.sourceType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {ct.resolvedDescription}
                        </p>
                        <a
                          href={ct.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 mt-1 truncate"
                        >
                          <span className="truncate">{ct.sourceUrl}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                      <button
                        onClick={() => deleteCustomTopic(ct.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
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

        {/* TAB 3: DYNAMIC TOPIC CONFIGURATION ENGINE */}
        {activeTab === "resolver" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center pb-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic Topic Configuration Engine</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Enter any domain or custom interest prompt (e.g., &quot;Formula 1 Racing&quot;, &quot;Autonomous Vehicles&quot;).
                The AI agent resolves and validates the RSS/API config into your pipeline without breaking templates.
              </p>
            </div>

            <form onSubmit={resolveCustomTopic} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Formula 1 Racing, Rust WebAssembly, Quantum Physics..."
                value={resolvePrompt}
                onChange={(e) => setResolvePrompt(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isResolving || !resolvePrompt.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
              >
                {isResolving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Resolve Feed</span>
                  </>
                )}
              </button>
            </form>

            {resolvedCandidate && (
              <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Feed Validated & Resolved ({resolvedCandidate.confidence} confidence)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                    {resolvedCandidate.sourceType}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    {resolvedCandidate.resolvedName}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {resolvedCandidate.resolvedDescription}
                  </p>
                  <p className="text-xs font-mono text-slate-400 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800 break-all">
                    {resolvedCandidate.sourceUrl}
                  </p>
                </div>

                <button
                  onClick={addResolvedTopic}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Append to Active Daily Pipeline</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STORAGE & 7-DAY TTL RETENTION POLICY */}
        {activeTab === "storage" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    7-Day Rolling Retention Window (TTL Purge)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Automated maintenance permanently caps storage footprint at &lt; 5–10 MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Retention Window
                  </span>
                  <span className="text-xl font-black text-indigo-400 mt-1 block">7 Days</span>
                  <span className="text-[11px] text-slate-400">Strict rolling cutoff</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    Database Footprint
                  </span>
                  <span className="text-xl font-black text-emerald-400 mt-1 block">&lt; 2.5 MB</span>
                  <span className="text-[11px] text-slate-400">SQLite + WAL Mode</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-indigo-300">
                  Zero Maintenance Overhead Protocol:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Dispatched briefings automatically purge after 168 hours (7 days).</li>
                  <li>Deduplication hashes retain 7-day memory to eliminate recurring news.</li>
                  <li>Single-user architecture eliminates multi-tenant database bloat.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        Personal Intelligence Engine • Single-User V1 • Built with Next.js, Node.js SQLite & Gemini AI
      </footer>
    </div>
  );
}
