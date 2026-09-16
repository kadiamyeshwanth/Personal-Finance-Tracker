import React from 'react';

/* Official brand icons, downloaded from Brandfetch (brandfetch.com) and
   bundled under public/brands/ — 256×256, served from our own origin, so
   nothing loads from a third party at runtime.
   Order matters: first regex hit wins, tested against name + symbol. */
const ICONS = [
  // banks
  [/hdfc/i, 'hdfcbank.jpeg', 'HDFC Bank'],
  [/icici/i, 'icicibank.jpeg', 'ICICI Bank'],
  [/\baxis\b/i, 'axisbank.png', 'Axis Bank'],
  [/\bsbi\b|state bank/i, 'sbi.jpeg', 'State Bank of India'],
  [/kotak/i, 'kotak.png', 'Kotak Mahindra Bank'],
  [/\bpnb\b|punjab national/i, 'pnb.png', 'Punjab National Bank'],
  // payments & brokers
  [/paytm/i, 'paytm.jpeg', 'Paytm'],
  [/phonepe/i, 'phonepe.jpeg', 'PhonePe'],
  [/zerodha|\bkite\b/i, 'zerodha.jpeg', 'Zerodha'],
  [/groww/i, 'groww.svg', 'Groww'],
  // crypto (before the companies, so "BNB"/"Coinbase" don't hit a stock rule)
  [/\bbtc\b|bitcoin/i, 'bitcoin.jpeg', 'Bitcoin'],
  [/\beth\b|ethereum/i, 'ethereum.jpeg', 'Ethereum'],
  [/\busdt?\b|tether/i, 'tether.png', 'Tether'],
  [/\bbnb\b|binance/i, 'binance.jpeg', 'Binance'],
  [/\bsol\b|solana/i, 'solana.jpeg', 'Solana'],
  [/\bxrp\b|ripple/i, 'xrp.png', 'XRP'],
  [/\bdoge\b|dogecoin/i, 'dogecoin.png', 'Dogecoin'],
  [/\bada\b|cardano/i, 'cardano.jpeg', 'Cardano'],
  [/\bltc\b|litecoin/i, 'litecoin.jpeg', 'Litecoin'],
  [/\bmatic\b|\bpol\b|polygon/i, 'polygon.jpeg', 'Polygon'],
  [/coinbase/i, 'coinbase.png', 'Coinbase'],
  // companies
  [/infosys|\binfy\b/i, 'infosys.jpeg', 'Infosys'],
  [/\btcs\b|tata consultancy/i, 'tcs.jpeg', 'TCS'],
  [/reliance|\bril\b/i, 'reliance.jpeg', 'Reliance Industries'],
  [/wipro/i, 'wipro.jpeg', 'Wipro'],
  [/zomato/i, 'zomato.png', 'Zomato'],
  [/\btata\b/i, 'tata.jpeg', 'Tata'],
  [/amazon/i, 'amazon.jpeg', 'Amazon'],
  [/google|alphabet|gpay/i, 'google.jpeg', 'Google'],
  [/\bapple\b|\baapl\b/i, 'apple.png', 'Apple'],
  [/microsoft|\bmsft\b/i, 'microsoft.jpeg', 'Microsoft'],
  [/tesla|\btsla\b/i, 'tesla.png', 'Tesla'],
  [/netflix|\bnflx\b/i, 'netflix.jpeg', 'Netflix'],
  [/nvidia|\bnvda\b/i, 'nvidia.jpeg', 'NVIDIA'],
];

const STOCK_HEX = ['#E85002', '#0A66C2', '#16A34A', '#7C3AED', '#DB2777', '#0891B2', '#CA8A04'];
const hashHue = (s = '') => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return STOCK_HEX[Math.abs(h) % STOCK_HEX.length]; };

export default function BrandLogo({ name = '', symbol = '', type = '', size = 40, radius = 11 }) {
  const hay = `${name} ${symbol}`;
  const [failed, setFailed] = React.useState(false);
  let hit = ICONS.find(([re]) => re.test(hay));
  // an unnamed crypto holding still reads as crypto
  if (!hit && type === 'crypto') hit = ICONS.find(([, file]) => file === 'bitcoin.jpeg');

  const box = { width: size, height: size, borderRadius: radius, flexShrink: 0 };

  if (hit && !failed) {
    const [, file, title] = hit;
    return (
      <img
        src={`/brands/${file}`}
        alt="" title={title} width={size} height={size} loading="lazy" decoding="async"
        onError={() => setFailed(true)}
        style={{ ...box, objectFit: 'cover', display: 'block' }}
      />
    );
  }

  // Monogram fallback for brands we don't have an icon for
  const initials = (name || symbol || '?').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const hex = hashHue(name || symbol);
  return (
    <span style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: `${hex}1f`, color: hex }} title={name}>
      <span style={{ fontSize: size * 0.34, fontWeight: 800 }}>{initials}</span>
    </span>
  );
}
