# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **High school / vocational students**: Competing in esports tournaments, forming and joining teams via invite codes, tracking personal match statistics, and booking computer lab gaming stations.
- **School teachers, organizers & tournament admins**: Creating tournaments, configuring game rulebooks, seeding brackets with ELO weighting, managing school lab PCs and reservations, verifying academic requirements, and handling incident reports.
- **Spectators & school community**: Viewing live tournament brackets, match streams, schedules, leaderboards, and hallway TV kiosk displays.

## Product Purpose

An all-in-one school esports hub that fosters teamwork, strategic thinking, and community engagement in high school environments by providing automated tournament brackets with ELO-based seeding, team management, school lab PC workstation reservations, and live TV kiosk presentations.

## Positioning

Unlike generic commercial tournament software (Challonge, FACEIT, Toornament), this platform integrates directly with high school infrastructure: central Keycloak single sign-on (`keycloak.pollak.info`), local school lab workstation booking, academic grade compliance verification, game-specific API stat linking, and unauthenticated public TV display modes for hallway monitors.

## Operating Context

- **Classroom & Computer Labs**: Students reserving workstations during free periods and LAN game days; admins tracking hardware statuses.
- **School Hallways & Auditoriums**: Wall-mounted TV displays running kiosk modes (`/tv`) showcasing upcoming matches, team standings, and recruitment callouts.
- **Mobile & Personal Devices**: Students managing team rosters, accepting match invitations, viewing brackets, and checking notifications on mobile phones and laptops.
- **Discord Integration**: Community communication and webhook synchronization for match results and announcements.

## Capabilities and Constraints

- **Role-Based Access Control**:
  - Administrator (complete system management, audits, user permissions)
  - Organizer / Szervező (bracket generation, ELO adjustments, tournament schedules)
  - Moderator (dispute resolution, incident management, rule enforcement)
  - Student / Diák (participation, team management, booking, viewing stats)
- **Tournament Engine**: Single elimination, double elimination, group stages; automated bracket generation; ELO rating adjustments feeding future seedings.
- **Team Management**: Team creation, code-based joining, roster locks, game rank requirements.
- **Lab Station Booking**: Time-slot reservation, kiosk check-in, capacity management.
- **TV & Kiosk Displays**: Clean, self-refreshing, non-interactive visual views designed for large-format screens.
- **Technical Architecture**: React 19, Vite, Tailwind CSS, Shadcn UI / Radix UI, Redux Toolkit, React Router v7.

## Brand Commitments

- **Platform Name**: Esport Tournament Platform (Iskolai Esport Versenyszervező Rendszer).
- **Language**: Primary interface in Hungarian (with natural esports terminology in English where standard: Bracket, ELO, Roamer, Seed, etc.).
- **Tone**: Professional yet authentic to competitive gaming; encouraging, high-energy, clean, and modern.
- **Visual Identity**: Modern esports theme with deep charcoal/slate dark mode, vibrant purple/indigo/violet accents, crisp typography, and high-contrast data visualization.

## Evidence on Hand

- Project specification and requirements: [project.md](project.md)
- Complete UX/UI and technical review audit: [UX_UI_REVIEW.md](UX_UI_REVIEW.md)
- Game ranks and tier data definitions: [gameranks.json](gameranks.json)
- Tournament bracket fixture data: [tournament_test.json](tournament_test.json)
- Academic grade sample dataset: [pelda_jegyek.xlsx](pelda_jegyek.xlsx)

## Product Principles

1. **Unbreakable Layouts**: Every card, table, bracket node, and form must gracefully accommodate worst-case content (long gamer tags, non-Latin nicknames, missing avatars, extreme score counts, single-item lists, and zero states) without layout overflow or visual shearing.
2. **Accessible Across All Devices**: Seamless experience scaling from 320px mobile screens, standard laptops, up to 1080p/4K television kiosk monitors without clipped elements or unreachable interactions.
3. **Institutional Integrity with Gamer Appeal**: Retains institutional clarity, safety, and school rule enforcement while delivering the sleek aesthetic and excitement of professional esports broadcasts.
4. **Resilient Data and State Handling**: Clear, reassuring states for loading, empty, error, and offline conditions; actions give instant visual feedback with actionable notifications.

## Accessibility & Inclusion

- Keyboard navigability with focus traps, explicit escape-key dismissal for modals, and aria attributes across interactive widgets.
- Adherence to WCAG AA contrast standards across dark and light modes.
- Support for reduced-motion preferences, suppressing non-essential hero animations.
