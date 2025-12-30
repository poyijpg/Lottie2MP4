import React, { useState, useEffect } from 'react';
import { Download, Sparkles, Loader2, PlayCircle, RefreshCw, X, Settings, AlertTriangle } from 'lucide-react';
import Dropzone from './components/Dropzone';
import ControlPanel from './components/ControlPanel';
import { ConvertOptions, Resolution, FrameRate, ConversionStatus, LottieFile, GeminiAnalysisResult } from './types';
import { renderAndConvert } from './services/converter';
import { analyzeAnimation } from './services/gemini';
import lottie from 'lottie-web';

const App: React.FC = () => {
  const [lottieData, setLottieData] = useState<LottieFile | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  const [options, setOptions] = useState<ConvertOptions>({
    resolution: Resolution.FHD,
    fps: FrameRate.FPS_60
  });

  const [status, setStatus] = useState<ConversionStatus>({
    state: 'idle',
    progress: 0
  });

  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewContainer, setPreviewContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lottieData && previewContainer) {
      previewContainer.innerHTML = '';
      const anim = lottie.loadAnimation({
        container: previewContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: lottieData,
      });
      return () => anim.destroy();
    }
  }, [lottieData, previewContainer]);

  const handleFileLoaded = (data: any, name: string) => {
    setLottieData(data);
    setFileName(name.replace('.json', ''));
    setStatus({ state: 'idle', progress: 0 });
    setAnalysis(null);
  };

  const handleReset = () => {
    setLottieData(null);
    setFileName('');
    setStatus({ state: 'idle', progress: 0 });
    setAnalysis(null);
  };

  const handleConvert = async () => {
    if (!lottieData) return;

    try {
      setStatus({ state: 'rendering', progress: 0, message: 'Initializing Renderer...' });
      
      const url = await renderAndConvert(
        lottieData, 
        options, 
        (msg, pct) => setStatus({ state: 'rendering', progress: pct, message: msg })
      );

      setStatus({ 
        state: 'completed', 
        progress: 100, 
        message: 'Conversion Complete!', 
        outputUrl: url 
      });
    } catch (error: any) {
      console.error(error);
      let errMsg = "An unexpected error occurred.";
      
      if (typeof error === 'string') {
        errMsg = error;
      } else if (error.message) {
         if (error.message.includes("VideoEncoder")) {
             errMsg = "Encoding Error: Your browser might not support the required video codecs. Please try Chrome/Edge.";
         } else {
             errMsg = error.message;
         }
      }

      setStatus({ state: 'error', progress: 0, error: errMsg });
    }
  };

  const handleAnalyze = async () => {
    if (!lottieData) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeAnimation(lottieData);
      setAnalysis(result);
    } catch (e) {
      alert("Failed to analyze. Please check your API Key configuration.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 to-gray-900 text-white font-sans selection:bg-brand-500 selection:text-white">
      <header className="border-b border-gray-800 bg-dark-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <PlayCircle className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Lottie2MP4 <span className="text-brand-500">Pro</span></h1>
          </div>
          <div className="text-xs font-mono text-gray-500 border border-gray-700 px-3 py-1 rounded-full">
            v3.3 • High-Fidelity SVG Engine
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {!lottieData ? (
          <div className="max-w-xl mx-auto mt-20 space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-purple-500">
                Convert Lottie to 4K Video
              </h2>
              <p className="text-gray-400 text-lg">
                Drag and drop your Jitter or Lottie JSON files. <br/> 
                Support for 120fps, 4K resolution, and AI analysis.
              </p>
            </div>
            <Dropzone onFileLoaded={handleFileLoaded} disabled={false} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Preview & AI */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-dark-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-200 truncate pr-4">{fileName}.json</h3>
                  <button onClick={handleReset} className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded-md transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="aspect-video bg-gray-900/50 flex items-center justify-center p-4 relative">
                   <div 
                      ref={setPreviewContainer} 
                      className="w-full h-full"
                   />
                </div>
              </div>

              {/* Gemini AI Section */}
              <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl border border-indigo-500/30 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-indigo-400">
                    <Sparkles className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Gemini AI Analysis</span>
                  </div>
                  {!analysis && (
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition disabled:opacity-50 flex items-center"
                    >
                      {isAnalyzing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      Analyze JSON
                    </button>
                  )}
                </div>
                
                {analysis ? (
                  <div className="space-y-3 text-sm text-indigo-100/80 animate-fade-in">
                    <p><strong className="text-indigo-300">Summary:</strong> {analysis.summary}</p>
                    <p><strong className="text-indigo-300">Specs:</strong> {analysis.technicalDetails}</p>
                    <p><strong className="text-indigo-300">Idea:</strong> {analysis.creativeSuggestions}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Use Gemini to inspect the Lottie structure, calculate effective duration, and get creative usage tips.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Controls & Process */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-dark-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                  <Settings className="w-6 h-6 mr-2 text-brand-500" />
                  Conversion Settings
                </h3>
                
                <ControlPanel 
                  options={options} 
                  setOptions={setOptions} 
                  disabled={status.state !== 'idle' && status.state !== 'completed' && status.state !== 'error'} 
                />

                <div className="mt-8 space-y-4">
                  {status.state === 'idle' || status.state === 'error' ? (
                     <button
                      onClick={handleConvert}
                      className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-brand-500/20 transition-all transform active:scale-95 flex items-center justify-center"
                    >
                      {status.state === 'error' ? (
                        <>
                          <RefreshCw className="w-6 h-6 mr-2" />
                          Retry Conversion
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-6 h-6 mr-2 fill-current" />
                          Start Conversion
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full py-6 bg-gray-900/50 rounded-xl border border-gray-700 flex flex-col items-center justify-center space-y-3">
                       {status.state === 'completed' ? (
                         <a 
                            href={status.outputUrl} 
                            download={`${fileName}_${options.resolution}_${options.fps}fps.mp4`}
                            className="flex items-center px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-500/20 transition-all animate-pulse-fast"
                         >
                            <Download className="w-5 h-5 mr-2" />
                            Download MP4
                         </a>
                       ) : (
                         <>
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            <div className="w-3/4 max-w-sm h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-brand-500 transition-all duration-300 ease-out"
                                style={{ width: `${status.progress}%` }}
                              />
                            </div>
                         </>
                       )}
                       <p className="text-gray-300 font-mono text-sm mt-2">{status.message}</p>
                    </div>
                  )}

                  {status.error && (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-300 rounded-lg text-sm flex items-start">
                      <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                      <span>{status.error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Note */}
              <div className="text-xs text-gray-500 text-center px-8">
                <p>Powered by native WebCodecs. 4K @ 120fps supported.</p>
                <p className="mt-1 opacity-50">Rendering runs locally in your browser.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;