import React from 'react';
import { ConvertOptions, FrameRate, Resolution } from '../types';
import { Settings, Film, Monitor } from 'lucide-react';

interface ControlPanelProps {
  options: ConvertOptions;
  setOptions: React.Dispatch<React.SetStateAction<ConvertOptions>>;
  disabled: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ options, setOptions, disabled }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-dark-800 rounded-xl border border-gray-700 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      
      {/* Resolution Selection */}
      <div className="space-y-3">
        <div className="flex items-center text-brand-500 mb-2">
          <Monitor className="w-5 h-5 mr-2" />
          <span className="font-medium text-white">Resolution</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(Resolution).map((res) => (
            <button
              key={res}
              onClick={() => setOptions({ ...options, resolution: res })}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${options.resolution === res 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 ring-1 ring-brand-400' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Frame Rate Selection */}
      <div className="space-y-3">
        <div className="flex items-center text-brand-500 mb-2">
          <Film className="w-5 h-5 mr-2" />
          <span className="font-medium text-white">Frame Rate</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[FrameRate.FPS_30, FrameRate.FPS_60, FrameRate.FPS_120].map((fps) => (
            <button
              key={fps}
              onClick={() => setOptions({ ...options, fps })}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${options.fps === fps 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 ring-1 ring-purple-400' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              `}
            >
              {fps} FPS
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
