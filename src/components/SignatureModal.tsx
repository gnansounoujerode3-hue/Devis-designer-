import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface Props {
  title: string;
  accent: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export default function SignatureModal({ title, accent, onSave, onClose }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleClear = () => sigRef.current?.clear();

  const handleSave = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    onSave(dataUrl);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onSave(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[540px] max-w-[95vw] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
          <h3 className="text-sm font-bold text-[#111] tracking-wider uppercase">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#F0F0F0] hover:bg-[#E0E0E0] flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-[#E8E8E8]">
          <button
            onClick={() => setMode('draw')}
            className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${mode === 'draw' ? 'text-[#111]' : 'text-[#BBB] hover:text-[#888]'}`}
            style={mode === 'draw' ? { boxShadow: `inset 0 -2px 0 ${accent}` } : {}}
          >
            DESSINER
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${mode === 'upload' ? 'text-[#111]' : 'text-[#BBB] hover:text-[#888]'}`}
            style={mode === 'upload' ? { boxShadow: `inset 0 -2px 0 ${accent}` } : {}}
          >
            IMPORTER PHOTO
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'draw' ? (
            <div>
              <div className="border-2 border-[#E8E8E8] rounded-xl overflow-hidden bg-white" style={{ touchAction: 'none' }}>
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#111"
                  canvasProps={{
                    width: 488,
                    height: 200,
                    className: 'w-full',
                    style: { width: '100%', height: '200px' },
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-xs font-bold tracking-wider text-[#999] hover:text-[#555] border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5] transition-colors"
                >
                  EFFACER
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 text-sm font-bold text-white rounded-lg transition-all hover:opacity-90 active:scale-95"
                  style={{ background: accent }}
                >
                  Valider la signature
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#DDD] rounded-xl cursor-pointer hover:border-[#BBB] transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <svg className="w-10 h-10 text-[#CCC] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm font-bold text-[#999]">Cliquer pour importer une photo</span>
                <span className="text-[10px] text-[#CCC] mt-1">PNG, JPG, JPEG — photo de votre signature</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-[#FAFAFA] border-t border-[#E8E8E8]">
          <p className="text-[10px] text-[#BBB] text-center">La signature sera integree au document et aux exports PDF/SVG</p>
        </div>
      </div>
    </div>
  );
}
