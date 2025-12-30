import React, { useCallback, useState } from 'react';
import { Upload, FileJson, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onFileLoaded: (data: any, fileName: string) => void;
  disabled: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileLoaded, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please upload a valid .json Lottie file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        onFileLoaded(json, file.name);
        setError(null);
      } catch (err) {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [disabled, onFileLoaded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed border-gray-600 bg-dark-800' : 'cursor-pointer'}
        ${isDragging 
          ? 'border-brand-500 bg-brand-900/20 scale-[1.02]' 
          : 'border-gray-600 hover:border-brand-500 hover:bg-dark-800'}
      `}
    >
      <input
        type="file"
        accept=".json"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={handleChange}
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-brand-500' : 'bg-gray-700'} transition-colors`}>
          {isDragging ? <FileJson className="w-8 h-8 text-white" /> : <Upload className="w-8 h-8 text-gray-300" />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {isDragging ? 'Drop it here!' : 'Click or drag Lottie JSON'}
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            Supports Jitter exports. Max 50MB.
          </p>
        </div>
      </div>

      {error && (
        <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}
    </div>
  );
};

export default Dropzone;
