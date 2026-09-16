/* One source of truth for the app's navigation — the sidebar and the phone's
   Menu sheet both render from this, so a page can't be reachable on one and
   missing on the other. Every route in App.jsx's protected block is here. */
import {
  SquaresFour, CreditCard, ChartBar, Wallet, TrendUp, Tag, ArrowsClockwise,
  Folder, Target, Trophy, UsersThree, FileText, BookOpen, Gift, Sparkle,
  GearSix, Lifebuoy,
} from '@phosphor-icons/react';

export const NAV_GROUPS = [
  {
    key: 'main', label: null,
    items: [
      { to: '/dashboard',    icon: SquaresFour, label: 'Overview' },
      { to: '/transactions', icon: CreditCard,  label: 'Transactions' },
      { to: '/analytics',    icon: ChartBar,    label: 'Analytics' },
    ],
  },
  {
    key: 'money', label: 'Money',
    items: [
      { to: '/wallets',       icon: Wallet,          label: 'Accounts' },
      { to: '/investments',   icon: TrendUp,         label: 'Portfolio' },
      { to: '/subscriptions', icon: Tag,             label: 'Subscriptions' },
      { to: '/recurring',     icon: ArrowsClockwise, label: 'Recurring' },
    ],
  },
  {
    key: 'plan', label: 'Planning',
    items: [
      { to: '/budgets',    icon: Folder,     label: 'Budgets' },
      { to: '/goals',      icon: Target,     label: 'Goals' },
      { to: '/challenges', icon: Trophy,     label: 'Challenges' },
      { to: '/family',     icon: UsersThree, label: 'Family' },
    ],
  },
  {
    key: 'review', label: 'Review',
    items: [
      { to: '/ai-insights', icon: Sparkle,  label: 'Insights' },
      { to: '/reports',     icon: FileText, label: 'Reports' },
      { to: '/journal',     icon: BookOpen, label: 'Journal' },
      { to: '/wrapped',     icon: Gift,     label: 'Monthly Wrapped' },
    ],
  },
];

export const NAV_FOOTER = [
  { to: '/settings', icon: GearSix,  label: 'Settings' },
  { to: '/help',     icon: Lifebuoy, label: 'Help' },
];
