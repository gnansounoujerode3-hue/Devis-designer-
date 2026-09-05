import { useState } from 'react';
import { VENDOR } from '../lib/config';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Comment installer l\'application ?',
    a: 'Sur PC : téléchargez le fichier .exe et double-cliquez dessus (aucune installation nécessaire). Sur téléphone : envoyez le fichier .apk sur votre appareil (WhatsApp, câble USB), ouvrez-le et autorisez l\'installation depuis « sources inconnues » lorsque le système le demande.',
  },
  {
    q: 'L\'application fonctionne-t-elle sans internet ?',
    a: `Oui, ${VENDOR.APP_NAME} fonctionne 100 % hors-ligne. Vous pouvez créer, modifier et exporter vos devis sans connexion. Internet n\'est nécessaire que pour les paiements (Chariow) et les liens de partage WhatsApp.`,
  },
  {
    q: 'Quels sont les prix ?',
    a: 'La version gratuite offre 20 exports PDF / envois pour signature. Ensuite : abonnement mensuel 2 000 F, abonnement 1 an 15 000 F, design personnalisé 5 000 F (paiement unique), ou tous les designs pendant 1 an 50 000 F.',
  },
  {
    q: 'Comment payer ?',
    a: 'Les paiements se font via Chariow (Mobile Money : MTN MoMo, Orange Money, Wave, Moov) ou selon les modalités indiquées dans la fenêtre d\'offres. Après paiement, vous recevez un code d\'activation.',
  },
  {
    q: 'Comment activer mon abonnement ?',
    a: 'Ouvrez la fenêtre des offres (bouton « PRO » ou « X EXPORTS GRATUITS » en haut), section « Déjà abonné ? », saisissez le code d\'activation reçu et cliquez sur « Activer ». Votre licence est active immédiatement.',
  },
  {
    q: 'Que se passe-t-il à la fin de mon abonnement ?',
    a: 'Vos devis restent consultables et modifiables. Seuls les nouveaux exports PDF et envois pour signature sont bloqués jusqu\'au renouvellement. Un rappel s\'affiche 3 jours avant l\'expiration.',
  },
  {
    q: 'Combien d\'exports gratuits ai-je droit ?',
    a: '20 exports (PDF ou envoi pour signature) par installation. La création de devis, elle, est illimitée et gratuite.',
  },
  {
    q: 'Comment sauvegarder mes devis ?',
    a: 'Sur la page d\'accueil, utilisez la barre « SAUVEGARDE » : « Exporter une copie » télécharge un fichier contenant tous vos devis et clients. « Restaurer une copie » permet de les réimporter, sur le même appareil ou un autre.',
  },
  {
    q: 'Puis-je utiliser l\'application sur plusieurs appareils ?',
    a: 'Oui. Exportez une copie de sauvegarde sur le premier appareil, puis restaurez-la sur le second. Vos devis et clients seront fusionnés (sans doublons).',
  },
  {
    q: 'Comment commander un design personnalisé (5 000 F) ?',
    a: 'Payez l\'offre « Design Personnalisé » (5 000 F), activez le code reçu, puis un encart vert apparaît avec un bouton WhatsApp : décrivez-y votre design (couleurs, logo, mise en page) et le designer vous le crée.',
  },
  {
    q: 'Comment gagner 3 mois gratuits ?',
    a: 'Après un export réussi, une fenêtre vous propose : 1) publiez votre meilleur devis sur votre statut WhatsApp, 2) recommandez l\'application, 3) confirmez. Un code de 3 mois gratuits vous est alors délivré (une seule fois par installation).',
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: 'Oui. Toutes vos données restent sur votre appareil : elles ne sont jamais envoyées sur internet ni partagées. Protégez simplement votre appareil avec un code PIN.',
  },
  {
    q: 'J\'ai perdu un code d\'activation, que faire ?',
    a: 'Contactez le support avec vos informations de paiement : le code pourra vous être renvoyé. Ne partagez jamais vos codes avec d\'autres personnes.',
  },
  {
    q: 'Comment contacter le support ?',
    a: `Par WhatsApp ou par téléphone au ${VENDOR.PHONE}, ou par email à ${VENDOR.EMAIL}. Nous répondons en général sous 24 h.`,
  },
];

export default function FAQModal({ open, onClose }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[97] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[#F0F0F0] dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#111] dark:text-white">Questions fréquentes</h2>
            <div className="text-[11px] text-[#888] mt-0.5">{FAQS.length} questions — touchez une question pour voir la réponse</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F0F0F0] dark:hover:bg-zinc-800 flex items-center justify-center text-[#999]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {FAQS.map((f, i) => (
            <div key={i} className="rounded-xl border border-[#ECECEC] dark:border-zinc-700 overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F8F8F8] dark:hover:bg-zinc-800 transition-colors"
              >
                <span className={`text-xs font-bold ${openIdx === i ? 'text-[#0057FF]' : 'text-[#333] dark:text-zinc-200'}`}>{f.q}</span>
                <span className={`text-[#999] text-sm transition-transform ${openIdx === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openIdx === i && (
                <div className="px-4 pb-3 text-[11px] leading-relaxed text-[#666] dark:text-zinc-400">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#F0F0F0] dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="text-[10px] text-[#999]">Une autre question ?<br />{VENDOR.PHONE}</div>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-[#111] dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
