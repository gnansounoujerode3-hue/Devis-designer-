import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: 'D',
    title: 'Bienvenue sur Devis Designer',
    text: "Créez des devis et factures professionnels en quelques minutes. Choisissez parmi 12 templates, ajoutez votre logo, vos conditions et vos signatures.",
  },
  {
    icon: '+',
    title: 'Créez votre premier document',
    text: "Cliquez sur « Nouveau document », remplissez les informations (client, articles, TVA) puis choisissez le modèle qui vous correspond. L'aperçu se met à jour en direct.",
  },
  {
    icon: '!',
    title: 'Exports gratuits',
    text: "Vous disposez de 20 exports PDF et envois pour signature gratuits. Ensuite, un abonnement à 2 000 F/mois ou 15 000 F/an débloque l'illimité.",
  },
  {
    icon: 'S',
    title: 'Ne perdez jamais vos données',
    text: "Pensez à sauvegarder régulièrement : menu Sauvegarde (Exporter une copie). Vous pourrez restaurer vos devis sur un autre appareil.",
  },
];

export default function Onboarding({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-7">
        <div className="w-14 h-14 rounded-2xl bg-[#0057FF] text-white flex items-center justify-center text-2xl font-black mb-4">
          {s.icon}
        </div>
        <div className="text-[10px] font-black tracking-widest text-[#0057FF] mb-1">
          ÉTAPE {step + 1} / {STEPS.length}
        </div>
        <h2 className="text-xl font-black text-[#111] dark:text-white mb-2">{s.title}</h2>
        <p className="text-sm text-[#666] dark:text-zinc-400 leading-relaxed mb-6">{s.text}</p>

        {/* Points de progression */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#0057FF]' : 'bg-[#E5E7EB] dark:bg-zinc-700'}`} />
          ))}
        </div>

        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(p => p - 1)} className="px-4 py-2.5 text-xs font-bold text-[#888] hover:text-[#555] dark:hover:text-zinc-300">
              Retour
            </button>
          ) : <span />}
          {last ? (
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-[#0057FF] text-white text-sm font-bold hover:opacity-90">
              Commencer
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-3 py-2.5 text-xs font-bold text-[#999] hover:text-[#555] dark:hover:text-zinc-300">
                Passer
              </button>
              <button onClick={() => setStep(p => p + 1)} className="px-5 py-2.5 rounded-lg bg-[#0057FF] text-white text-sm font-bold hover:opacity-90">
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
