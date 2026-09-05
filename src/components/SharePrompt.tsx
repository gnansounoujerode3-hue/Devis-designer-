import { useState } from 'react';
import {
  getMyRefCode, contestStatusWhatsAppUrl, contestRecommendWhatsAppUrl,
  isContestRewarded, markContestRewarded, generateContestRewardCode, getStoredContestCode,
} from '../lib/referral';

interface Props {
  open: boolean;
  /** Message contextuel affiché (ex: "Devis exporté avec succès !") */
  title?: string;
  onClose: () => void;
}

/**
 * CONCOURS (niveau 4) — popup affichée au bon moment (après un export réussi) :
 * 1. Partager son MEILLEUR devis sur son statut WhatsApp
 * 2. Recommander l'app (message + lien)
 * 3. Confirmer : 3 MOIS GRATUITS (1 seule fois par installation)
 */
export default function SharePrompt({ open, title, onClose }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [reward, setReward] = useState<string | null>(() => getStoredContestCode());
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const rewarded = isContestRewarded() || !!reward;

  const handleClaim = async () => {
    if (!confirmed || rewarded) return;
    const code = await generateContestRewardCode();
    markContestRewarded();
    setReward(code);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="text-lg font-black text-[#111] dark:text-white mb-1">
          {title || 'Devis exporté avec succès !'}
        </div>
        <p className="text-sm text-[#777] dark:text-zinc-400 mb-4">
          Gagnez <b className="text-green-600 dark:text-green-400">3 mois gratuits</b> :
          partagez votre meilleur devis sur votre statut WhatsApp et recommandez Devis Designer.
        </p>

        {!rewarded ? (
          <>
            {/* Étape 1 — statut WhatsApp */}
            <div className="rounded-xl bg-[#F0F7FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-900 p-3 mb-3 text-left">
              <div className="text-[10px] text-[#666] dark:text-zinc-400 font-bold tracking-widest mb-2">ÉTAPE 1 — PARTAGEZ VOTRE MEILLEUR DEVIS</div>
              <a
                href={contestStatusWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2.5 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:opacity-90"
              >
                Publier sur mon statut WhatsApp
              </a>
              <div className="text-[10px] text-[#999] mt-1.5">Astuce : envoyez aussi le fichier du devis en pièce jointe.</div>
            </div>

            {/* Étape 2 — recommandation */}
            <div className="rounded-xl bg-[#F0F7FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-900 p-3 mb-3 text-left">
              <div className="text-[10px] text-[#666] dark:text-zinc-400 font-bold tracking-widest mb-2">ÉTAPE 2 — RECOMMANDEZ L'APPLICATION</div>
              <a
                href={contestRecommendWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center py-2.5 rounded-lg bg-[#0057FF] text-white text-xs font-bold hover:opacity-90"
              >
                Recommander à un ami
              </a>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-[#666] dark:text-zinc-400 font-bold tracking-widest">VOTRE CODE PARRAIN</span>
                <button
                  onClick={() => { navigator.clipboard?.writeText(getMyRefCode()).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="font-mono font-black text-xs tracking-widest text-[#0057FF] bg-white dark:bg-zinc-900 rounded-lg px-2 py-1"
                >
                  {copied ? 'Copié !' : getMyRefCode()}
                </button>
              </div>
            </div>

            {/* Étape 3 — confirmation */}
            <label className="flex items-start gap-2 text-left cursor-pointer mb-3">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-[#0057FF]" />
              <span className="text-[11px] text-[#666] dark:text-zinc-400">
                J'ai partagé mon meilleur devis sur mon statut WhatsApp et recommandé l'application.
              </span>
            </label>

            <button
              onClick={handleClaim}
              disabled={!confirmed}
              className="w-full py-3 rounded-xl bg-[#10B981] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Obtenir mes 3 mois gratuits
            </button>
            <button onClick={onClose} className="w-full py-2 mt-1 text-xs text-[#999] hover:text-[#555] dark:hover:text-zinc-300">
              Plus tard
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[#777] dark:text-zinc-400 mb-3">
              Voici votre code récompense : <b className="text-green-600 dark:text-green-400">3 mois gratuits</b>.
              Activez-le dans « Déjà abonné ? ».
            </p>
            <div className="rounded-xl bg-[#FFFBEB] dark:bg-amber-950/30 border border-[#FDE68A] dark:border-amber-800 p-3 mb-3">
              <div className="font-mono font-black text-sm tracking-widest text-[#78350F] dark:text-amber-200 break-all">{reward}</div>
            </div>
            <button
              onClick={() => { navigator.clipboard?.writeText(reward || '').catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="w-full py-3 rounded-xl bg-[#111] dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 mb-2"
            >
              {copied ? 'Copié !' : 'Copier le code'}
            </button>
            <button onClick={onClose} className="w-full py-2 text-xs text-[#999] hover:text-[#555] dark:hover:text-zinc-300">
              Fermer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
