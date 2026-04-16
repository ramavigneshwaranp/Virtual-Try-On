/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  RefreshCw, 
  Check, 
  ChevronRight,
  Info,
  Loader2,
  Trash2,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  analyzeUserImage,
  getDressSuggestions,
  visualizeTryOn
} from "./lib/gemini";
import { 
  UserAnalysis, 
  DressSuggestion, 
  CustomizedDress 
} from "./types";
import confetti from "canvas-confetti";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<UserAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<DressSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<DressSuggestion | null>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizedImage, setVisualizedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleExport = (format: 'jpg' | 'png') => {
    if (!visualizedImage) return;
    
    const link = document.createElement('a');
    link.href = visualizedImage;
    link.download = `vogue-ai-look-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Customization state
  const [customization, setCustomization] = useState<CustomizedDress>({
    suggestionId: "",
    color: "#1A1A1A",
    pattern: "Solid",
    neckline: "V-Neck",
    length: "Midi",
  });

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setAnalysis(null);
        setSuggestions([]);
        setSelectedSuggestion(null);
        setVisualizedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
      setError("Unable to access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setImage(dataUrl);
      stopCamera();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setAnalysis(null);
        setSuggestions([]);
        setSelectedSuggestion(null);
        setVisualizedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysisData = await analyzeUserImage(base64.split(",")[1]);
      setAnalysis(analysisData);
      const suggestionData = await getDressSuggestions(analysisData);
      setSuggestions(suggestionData);
      if (suggestionData.length > 0) {
        setSelectedSuggestion(suggestionData[0]);
        setCustomization(prev => ({ 
          ...prev, 
          suggestionId: suggestionData[0].id,
          color: suggestionData[0].baseColor 
        }));
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setError("Analysis failed. Please try a different photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTryOn = async () => {
    if (!image || !selectedSuggestion) return;
    setIsVisualizing(true);
    setError(null);
    try {
      const prompt = `A ${customization.length} ${selectedSuggestion.style} dress in ${customization.color} color with ${customization.pattern} pattern and ${customization.neckline} neckline. Fabric: ${selectedSuggestion.recommendedFabric}.`;
      const result = await visualizeTryOn(image.split(",")[1], prompt);
      setVisualizedImage(result);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#1A1A1A', '#F4F1EE']
      });
    } catch (error) {
      console.error("Visualization failed:", error);
      setError("Dress fitting failed. Our digital atelier encountered an error.");
    } finally {
      setIsVisualizing(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-bg">
      {/* Left Vertical Rail */}
      <aside className="w-[60px] border-r border-ink/10 flex flex-col items-center py-8 justify-between shrink-0">
        <div className="text-2xl font-serif font-bold tracking-tighter">V.</div>
        <div className="rail-text uppercase text-[10px] tracking-[4px] opacity-50 font-sans whitespace-nowrap">
          VIRTUAL ATELIER 2026
        </div>
        <div className="opacity-20 flex flex-col gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-ink" />
          <div className="w-1.5 h-1.5 rounded-full bg-ink" />
          <div className="w-1.5 h-1.5 rounded-full bg-ink" />
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col p-10 overflow-hidden">
        <header className="mb-10">
          <h1 className="text-5xl font-serif font-light italic leading-tight">
            Virtual Fitting Room
          </h1>
        </header>

        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "flex-1 bg-[#EAE5E0] rounded-lg relative overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.05)] group transition-all duration-300",
            isDragging && "ring-4 ring-accent ring-inset bg-accent/5 backdrop-blur-sm"
          )}
        >
          {isDragging && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-accent/10 pointer-events-none">
              <Upload className="w-16 h-16 text-accent animate-bounce" />
              <p className="text-accent font-bold uppercase tracking-[4px] mt-4">Drop to fitting room</p>
            </div>
          )}
          {isVisualizing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                <p className="text-xs uppercase tracking-[3px] font-sans font-bold">Tailoring visualization...</p>
              </div>
            </div>
          )}

          {!image ? (
            <div className="absolute inset-0 flex items-center justify-center p-10">
              {isCameraOpen ? (
                <div className="relative h-full w-full flex flex-col items-center">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="h-full w-full object-cover rounded-md bg-black"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-10 flex gap-4">
                    <Button 
                      onClick={capturePhoto}
                      className="bg-accent text-white rounded-full h-16 w-16 shadow-lg shadow-accent/20 border-4 border-white"
                    >
                      <Camera className="w-6 h-6" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={stopCamera}
                      className="glass-blur rounded-full h-16 w-16 text-white"
                    >
                      <Trash2 className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-20">
                  <div className="text-center group-hover:scale-105 transition-transform duration-500">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-ink/20 flex items-center justify-center cursor-pointer mb-4 hover:border-accent transition-colors bg-white/50"
                    >
                      <Upload className="w-8 h-8 text-ink/30" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Upload Portrait</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                    />
                  </div>
                  <div className="text-center group-hover:scale-105 transition-transform duration-500">
                    <div 
                      onClick={startCamera}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-ink/20 flex items-center justify-center cursor-pointer mb-4 hover:border-accent transition-colors bg-white/50"
                    >
                      <Camera className="w-8 h-8 text-ink/30" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Live Capture</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={visualizedImage ? 'visualized' : 'original'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={visualizedImage || image} 
                  className="h-full w-full object-contain"
                  alt="Your portrait"
                  referrerPolicy="no-referrer"
                  onError={() => setError("The image could not be loaded. Please try again.")}
                />
              </AnimatePresence>

              {/* Error Message Overlay */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-none shadow-2xl flex items-center gap-3 z-50 text-[10px] uppercase tracking-widest font-bold"
                >
                  <Info className="w-4 h-4" />
                  {error}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 hover:bg-white/20 p-0 ml-2"
                    onClick={() => setError(null)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </motion.div>
              )}
              
              {/* Analysis Overlay */}
              <AnimatePresence>
                {analysis && !visualizedImage && !isVisualizing && (
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="absolute top-5 left-5 glass-blur p-4 rounded text-[11px] uppercase tracking-wider max-w-[200px]"
                  >
                    <div className="font-bold mb-2 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-accent" />
                      Live Analysis
                    </div>
                    <div className="space-y-1 opacity-80">
                      <div>Body: {analysis.bodyType}</div>
                      <div>Shape: {analysis.faceShape}</div>
                      <div className="text-accent">● Mapping Active</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reset and Export Actions */}
              <div className="absolute top-5 right-5 flex gap-2">
                <AnimatePresence>
                  {visualizedImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-full bg-white/20 hover:bg-white/40 glass-blur h-10 w-10 text-ink"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-blur border-ink/5 bg-white/80">
                          <DropdownMenuItem onClick={() => handleExport('jpg')} className="text-[10px] uppercase tracking-widest font-bold focus:bg-accent focus:text-white cursor-pointer">
                            Export as JPG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport('png')} className="text-[10px] uppercase tracking-widest font-bold focus:bg-accent focus:text-white cursor-pointer">
                             Export as PNG
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="rounded-full bg-white/20 hover:bg-white/40 glass-blur h-10 w-10 text-ink"
                  onClick={() => {
                    setImage(null);
                    setVisualizedImage(null);
                    setAnalysis(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Decorative Points (Simulation of body tracking) */}
              {!visualizedImage && !isVisualizing && image && (
                <div className="absolute inset-0 pointer-events-none opacity-40 animate-pulse">
                  <div className="absolute top-[25%] left-[48%] w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#D4AF37]" />
                  <div className="absolute top-[35%] left-[42%] w-1.5 h-1.5 rounded-full bg-accent" />
                  <div className="absolute top-[35%] left-[58%] w-1.5 h-1.5 rounded-full bg-accent" />
                  <div className="absolute top-[40%] left-[40%] w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#D4AF37]" />
                  <div className="absolute top-[40%] left-[60%] w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#D4AF37]" />
                  <div className="absolute top-[55%] left-[48%] w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#D4AF37]" />
                  <div className="absolute top-[75%] left-[42%] w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#D4AF37]" />
                  <div className="absolute top-[75%] left-[58%] w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_#D4AF37]" />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar (Controls) */}
      <section className="w-[400px] h-screen bg-white border-l border-ink/5 flex flex-col shrink-0 overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-10 space-y-10 pb-10">
            {/* Step Header */}
            <div>
              <p className="text-[10px] uppercase tracking-[4px] opacity-40 font-bold mb-1">Step {analysis ? "02" : "01"}</p>
              <h2 className="text-2xl font-serif">
                {analysis ? "Style Refinement" : "Portrait Analysis"}
              </h2>
            </div>

            {/* Analysis UI - Prominent Submit Button */}
            {!analysis && image && !isVisualizing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent p-8 rounded-none shadow-[20px_20px_60px_rgba(212,175,55,0.15)] text-white"
              >
                <h3 className="text-lg font-serif mb-2">Ready for Discovery</h3>
                <p className="text-[11px] opacity-80 mb-6 font-sans uppercase tracking-widest leading-relaxed">
                  We have received your portrait. Submit now to analyze your unique anatomical structure and unlock tailored recommendations.
                </p>
                <Button 
                  onClick={() => image && processImage(image)} 
                  disabled={isAnalyzing}
                  className="w-full bg-white text-accent hover:bg-white/90 rounded-none h-14 text-[10px] uppercase tracking-[3px] font-bold shadow-xl"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-3" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-3" />
                      Submit for AI Analysis
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Analysis Section */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[2px] text-accent mb-4">Anatomical Analysis</h3>
              <div className="flex flex-wrap gap-2">
                {isAnalyzing ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-7 w-20 bg-ink/5 animate-pulse rounded-full" />
                  ))
                ) : analysis ? (
                  <>
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-sans font-medium text-xs border-ink/10">
                      {analysis.bodyType} Structure
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-sans font-medium text-xs border-ink/10">
                      {analysis.faceShape} Profile
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-sans font-medium text-xs border-ink/10">
                      {analysis.skinTone} Tone
                    </Badge>
                    {analysis.physicalTraits.map((trait, i) => (
                      <Badge key={i} variant="outline" className="rounded-full px-3 py-1 font-sans font-medium text-xs border-ink/10">
                        {trait}
                      </Badge>
                    ))}
                  </>
                ) : (
                  <p className="text-xs opacity-30 italic">Upload a photo to see analysis</p>
                )}
              </div>
            </div>

            <Separator className="bg-ink/5" />

            {/* Suggestions Section */}
            <div className="flex flex-col h-[400px] border-y border-ink/5 py-8">
              <h3 className="text-xs font-bold uppercase tracking-[2px] text-accent mb-6 shrink-0">Selected recommendations</h3>
              {suggestions.length > 0 ? (
                <ScrollArea className="flex-1 pr-6 -mr-6" data-testid="suggestions-scroll">
                  <div className="space-y-10 pb-4">
                    {suggestions.map((suggestion) => (
                      <div 
                        key={suggestion.id}
                        onClick={() => {
                          setSelectedSuggestion(suggestion);
                          setCustomization(prev => ({ ...prev, suggestionId: suggestion.id, color: suggestion.baseColor }));
                        }}
                        className={cn(
                          "group cursor-pointer transition-all duration-500 relative",
                          selectedSuggestion?.id === suggestion.id ? "opacity-100" : "opacity-30 hover:opacity-60"
                        )}
                      >
                        {selectedSuggestion?.id === suggestion.id && (
                          <motion.div 
                            layoutId="active-indicator"
                            className="absolute -left-10 top-2 w-1 h-8 bg-accent"
                          />
                        )}
                        <div className="flex items-baseline justify-between mb-3">
                          <h4 className="text-2xl font-serif italic">{suggestion.name}</h4>
                        </div>
                        <p className="text-[13px] opacity-70 leading-relaxed font-sans mb-4">
                          {suggestion.description}
                        </p>
                        <div className="bg-bg/50 p-3 flex items-start gap-3 rounded-sm">
                          <Info className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                          <p className="text-[10px] leading-relaxed opacity-60">
                            <span className="font-bold uppercase tracking-tighter mr-1 text-accent">Rationale:</span>
                            {suggestion.reasoning}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 flex-1 opacity-20">
                  <Sparkles className="w-8 h-8" />
                  <p className="text-[10px] uppercase tracking-widest font-bold">Suggestions curated upon analysis</p>
                </div>
              )}
            </div>

            {/* Customization Section */}
            {selectedSuggestion && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 pt-4"
              >
                <Separator className="bg-ink/5" />
                <h3 className="text-xs font-bold uppercase tracking-[2px] text-accent">Style Refinement</h3>
                
                {/* Color Palette */}
                <div>
                   <label className="text-[10px] uppercase tracking-widest opacity-50 mb-3 block">Color Palette</label>
                   <div className="flex gap-3">
                     {["#1A1A1A", "#2C3E50", "#7F8C8D", "#E67E22", "#D4AF37", "#FFFFFF"].map((c) => (
                       <button
                         key={c}
                         onClick={() => setCustomization(prev => ({ ...prev, color: c }))}
                         className={cn(
                           "w-10 h-10 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] transition-transform duration-200",
                           customization.color === c ? "scale-110 shadow-[0_0_0_2px_#D4AF37]" : "hover:scale-105"
                         )}
                         style={{ backgroundColor: c }}
                       />
                     ))}
                   </div>
                </div>

                {/* Length Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between text-xs tracking-tight">
                    <span>Dress Length</span>
                    <span className="font-bold italic">{customization.length}</span>
                  </div>
                  <Tabs 
                    defaultValue="Midi" 
                    value={customization.length} 
                    onValueChange={(val) => setCustomization(prev => ({ ...prev, length: val as any }))}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 bg-ink/5">
                      <TabsTrigger value="Mini" className="data-[state=active]:bg-ink data-[state=active]:text-white">Mini</TabsTrigger>
                      <TabsTrigger value="Midi" className="data-[state=active]:bg-ink data-[state=active]:text-white">Midi</TabsTrigger>
                      <TabsTrigger value="Maxi" className="data-[state=active]:bg-ink data-[state=active]:text-white">Maxi</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* neckline/pattern selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block">Neckline</label>
                    <select 
                      value={customization.neckline}
                      onChange={(e) => setCustomization(prev => ({ ...prev, neckline: e.target.value }))}
                      className="w-full bg-ink/5 border-none rounded p-2 text-xs focus:ring-0 outline-none"
                    >
                      {["V-Neck", "Round", "Sweetheart", "Square", "Halter"].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block">Pattern</label>
                    <select 
                      value={customization.pattern}
                      onChange={(e) => setCustomization(prev => ({ ...prev, pattern: e.target.value }))}
                      className="w-full bg-ink/5 border-none rounded p-2 text-xs focus:ring-0 outline-none"
                    >
                      {["Solid", "Floral", "Abstract", "Stripped", "Polka Dot"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Action Button */}
        <div className="p-10 bg-white border-t border-ink/5">
          <Button 
            disabled={!selectedSuggestion || isVisualizing || isAnalyzing}
            onClick={handleTryOn}
            className="w-full h-16 bg-ink text-white rounded-none uppercase tracking-[4px] font-bold text-xs hover:bg-ink/90 transition-all duration-300 disabled:opacity-20 flex items-center justify-center gap-3 group"
          >
            {isVisualizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Visualizing...
              </>
            ) : (
              <>
                Generate Visualization
                <Sparkles className="w-4 h-4 group-hover:text-accent transition-colors" />
              </>
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}
