/**
 * ActivityDropdown — collapsible activity summary card.
 *
 * Ported from the supplied reference component. The interaction contract is
 * preserved exactly: a header that expands a CSS-grid track from `0fr` to
 * `1fr` (so the reveal animates height without a hard-coded max-height), rows
 * that fade + rise in on a staggered `transitionDelay`, and a chevron that
 * flips 180°. What changed is the skin — Tailwind neutral/white classes were
 * replaced with Clario's CSS-variable system (`var(--bg-secondary)`,
 * `var(--brand)`, …) and dark-gradient icon chips, so it sits inside the
 * violet "board" design system instead of importing its own palette.
 *
 * Unlike the reference, `items` is a prop — this reads real notification /
 * alert data rather than five hardcoded activities.
 */
import { useState } from 'react';
import { CaretUp, Bell } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

export function ActivityDropdown({
  items = [],
  title,
  subtitle = 'What is happening around you',
  className,
  defaultOpen = false,
  onItemClick,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const heading = title ?? `${items.length} ${items.length === 1 ? 'Update' : 'Updates'}`;

  return (
    <div
      className={cn('activity-dropdown', isOpen && 'is-open', className)}
      onClick={() => setIsOpen(o => !o)}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(o => !o); }
      }}
    >
      {/* Header */}
      <div className="activity-dropdown-head">
        <div className="activity-dropdown-bell">
          <span className="ad-pulse" aria-hidden="true" />
          <Bell size={17} weight="fill" />
        </div>
        <div className="activity-dropdown-headtext">
          <h3>{heading}</h3>
          <p className={isOpen ? 'is-collapsed' : ''}>{subtitle}</p>
        </div>
        <div className="activity-dropdown-chevron">
          <CaretUp size={16} weight="bold" className={isOpen ? '' : 'is-flipped'} />
        </div>
      </div>

      {/* Activity list — CSS-grid track animates 0fr → 1fr, no fixed height */}
      <div className={cn('activity-dropdown-track', isOpen && 'is-open')}>
        <div className="activity-dropdown-inner">
          <div className="activity-dropdown-list">
            {items.length === 0 && (
              <div className="activity-dropdown-empty">Nothing new right now.</div>
            )}
            {items.map((activity, index) => (
              <div
                key={activity.id}
                className={cn('activity-row', isOpen && 'is-open')}
                style={{ transitionDelay: isOpen ? `${index * 65}ms` : '0ms' }}
                onClick={(e) => { if (onItemClick) { e.stopPropagation(); onItemClick(activity); } }}
              >
                <div className="activity-row-icon" style={activity.tone ? { '--tone': activity.tone } : undefined}>
                  {activity.icon}
                </div>
                <div className="activity-row-body">
                  <h4>{activity.title}</h4>
                  <p>{activity.description}</p>
                </div>
                <span className="activity-row-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityDropdown;
