/**
 * Illustration — a recoloured undraw/storyset SVG, inlined so its parts animate.
 *
 * The nine source files under src/assets/illustrations/ are recoloured to a
 * black/white line-drawing that sits on an orange card (see prelanding.css).
 * This component:
 *   · inlines the SVG (via ?raw) so the DOM owns its nodes
 *   · reveals it once on scroll-in with a blur-lift
 * The "moving parts" (figure sway, coins bob) are pure CSS in prelanding.css,
 * so the illustration stays in a fixed spot — no scroll parallax.
 *
 *   <Illustration name="wallet" />
 */
import { motion } from 'framer-motion';

import financialAdvisor from '../../assets/illustrations/financial-advisor.svg?raw';
import addingFunds from '../../assets/illustrations/adding-funds.svg?raw';
import financialData from '../../assets/illustrations/financial-data.svg?raw';
import emptyWallet from '../../assets/illustrations/empty-wallet.svg?raw';
import savingMoney from '../../assets/illustrations/saving-money.svg?raw';
import appMonetization from '../../assets/illustrations/app-monetization.svg?raw';
import analyticsCuate from '../../assets/illustrations/analytics-cuate.svg?raw';
import wallet from '../../assets/illustrations/wallet.svg?raw';
import analytics from '../../assets/illustrations/analytics.svg?raw';

const SVGS = {
  'financial-advisor': financialAdvisor,
  'adding-funds': addingFunds,
  'financial-data': financialData,
  'empty-wallet': emptyWallet,
  'saving-money': savingMoney,
  'app-monetization': appMonetization,
  'analytics-cuate': analyticsCuate,
  wallet,
  analytics,
};

export default function Illustration({ name, className = '', style }) {
  const raw = SVGS[name];
  if (!raw) return null;

  return (
    <div className={`pl-illo ${className}`.trim()} style={style}>
      <motion.div
        className="pl-illo-fig"
        initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    </div>
  );
}
