import React from 'react';

// Real brand marks from `thesvg` (monochrome, brand-coloured, CSP-safe —
// the SVG string is bundled, nothing loads from the network).
import btc from 'thesvg/bitcoin';
import eth from 'thesvg/ethereum';
import usdt from 'thesvg/tether';
import bnb from 'thesvg/binance';
import sol from 'thesvg/solana';
import xrp from 'thesvg/xrp';
import doge from 'thesvg/dogecoin';
import ada from 'thesvg/cardano';
import ltc from 'thesvg/litecoin';
import matic from 'thesvg/polygon';
import coinbase from 'thesvg/coinbase';
import hdfcBank from 'thesvg/hdfc-bank';
import iciciBank from 'thesvg/icici-bank';
import axisBank from 'thesvg/axis-bank';
import pnb from 'thesvg/punjab-national-bank';
import infosys from 'thesvg/infosys';
import tcs from 'thesvg/tata-consultancy-services';
import tata from 'thesvg/tata';
import reliance from 'thesvg/reliance-industries-limited';
import wipro from 'thesvg/wipro';
import zomato from 'thesvg/zomato';
import zerodha from 'thesvg/zerodha';
import paytm from 'thesvg/paytm';
import amazon from 'thesvg/amazon';
import google from 'thesvg/google';
import apple from 'thesvg/apple';
import microsoft from 'thesvg/microsoft';
import tesla from 'thesvg/tesla';
import netflix from 'thesvg/netflix';
import nvidia from 'thesvg/nvidia';

// Order matters — first regex hit wins. Test against name + symbol.
const MAP = [
  [/\bbtc\b|bitcoin/i, btc],
  [/\beth\b|ethereum/i, eth],
  [/\busdt?\b|tether/i, usdt],
  [/\bbnb\b|binance/i, bnb],
  [/\bsol\b|solana/i, sol],
  [/\bxrp\b|ripple/i, xrp],
  [/\bdoge\b|dogecoin/i, doge],
  [/\bada\b|cardano/i, ada],
  [/\bltc\b|litecoin/i, ltc],
  [/\bmatic\b|polygon/i, matic],
  [/coinbase/i, coinbase],
  [/hdfc/i, hdfcBank],
  [/icici/i, iciciBank],
  [/\baxis\b/i, axisBank],
  [/\bpnb\b|punjab national/i, pnb],
  [/infosys|\binfy\b/i, infosys],
  [/\btcs\b|tata consultancy/i, tcs],
  [/reliance|\bril\b/i, reliance],
  [/wipro/i, wipro],
  [/zomato/i, zomato],
  [/zerodha|\bkite\b/i, zerodha],
  [/\btata\b/i, tata],
  [/paytm/i, paytm],
  [/amazon/i, amazon],
  [/google|alphabet/i, google],
  [/\bapple\b|\baapl\b/i, apple],
  [/microsoft|\bmsft\b/i, microsoft],
  [/tesla|\btsla\b/i, tesla],
  [/netflix|\bnflx\b/i, netflix],
  [/nvidia|\bnvda\b/i, nvidia],
];

const norm = (h = '') => {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return h.length === 6 ? h : '888888';
};
const luma = (h) => {
  const n = norm(h);
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const STOCK_HEX = ['#E85002', '#0A66C2', '#16A34A', '#7C3AED', '#DB2777', '#0891B2', '#CA8A04'];
const hashHue = (s = '') => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return STOCK_HEX[Math.abs(h) % STOCK_HEX.length]; };

export default function BrandLogo({ name = '', symbol = '', type = '', size = 40, radius = 11 }) {
  const hay = `${name} ${symbol}`;
  let mark = MAP.find(([re]) => re.test(hay))?.[1];
  if (!mark && type === 'crypto') mark = btc;

  const box = { width: size, height: size, borderRadius: radius, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };

  if (mark) {
    const light = luma(mark.hex) > 0.82;                       // white-ish logo → needs a dark tile
    const bg = light ? '#1B1A19' : `#${norm(mark.hex)}1f`;
    return (
      <span style={{ ...box, background: bg }} title={mark.title}>
        <span
          className="brandlogo-mark"
          style={{ width: size * 0.56, height: size * 0.56, display: 'flex' }}
          dangerouslySetInnerHTML={{ __html: mark.svg }}
        />
      </span>
    );
  }

  // Monogram fallback
  const initials = (name || symbol || '?').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const hex = hashHue(name || symbol);
  return (
    <span style={{ ...box, background: `${hex}1f`, color: hex }} title={name}>
      <span style={{ fontSize: size * 0.34, fontWeight: 800 }}>{initials}</span>
    </span>
  );
}
