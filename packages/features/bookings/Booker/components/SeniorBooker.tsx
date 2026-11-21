import { useEffect, useMemo, useRef, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { getNonEmptyScheduleDays } from "@calcom/features/schedules/lib/use-schedule/useNonEmptyScheduleDays";
import { TimeFormat } from "@calcom/lib/timeFormat";

import type { useScheduleForEventReturnType } from "../utils/event";
import { useBookerTime } from "./hooks/useBookerTime";

/**
 * Senior-friendly booking layout for Doctorcita.
 *
 * Designed for the primary audience (women 60+, on mobile, "fat fingers"):
 * - Extra large touch targets (>= 60-70px)
 * - High contrast warm/medical palette (WCAG AA)
 * - Horizontal day carousel with big chevrons + swipe
 * - 2-column grid of large time buttons
 * - Sticky "Continuar" button + floating help button
 *
 * This component is fully self-contained styling-wise (inline styles + a small
 * scoped stylesheet) so it is unaffected by the surrounding theme/dark mode.
 */

// Medical / trustworthy palette (kept explicit so it never inherits dark mode).
const COLORS = {
  bg: "#FAF9F5",
  surface: "#FFFFFF",
  text: "#111111",
  textSoft: "#444444",
  accent: "#10B981", // medical green
  accentSoft: "#E7F8F1",
  accentDark: "#0B7A5A",
  border: "#D9D6CE",
  borderStrong: "#111111",
};

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const DOW = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MONTHS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

type SeniorBookerProps = {
  event: {
    data?: Pick<BookerEvent, "title" | "length" | "profile" | "subsetOfUsers"> | null;
    isPending: boolean;
  };
  schedule?: useScheduleForEventReturnType;
  isLoading: boolean;
  bookerState: string;
  skipConfirmStep: boolean;
  onTimeSelect: (time: string) => void;
  onSubmit: (timeSlot?: string) => void;
  /** The standard Cal.com booking form, rendered once a slot is confirmed. */
  bookEventForm: React.ReactNode;
};

export const SeniorBooker = ({
  event,
  schedule,
  isLoading,
  bookerState,
  skipConfirmStep,
  onTimeSelect,
  onSubmit,
  bookEventForm,
}: SeniorBookerProps) => {
  const selectedDate = useBookerStoreContext((state) => state.selectedDate);
  const setSelectedDate = useBookerStoreContext((state) => state.setSelectedDate);
  const selectedTimeslot = useBookerStoreContext((state) => state.selectedTimeslot);

  const { timeFormat, timezone } = useBookerTime();
  const slotFormat = timeFormat === TimeFormat.TWENTY_FOUR_HOUR ? "HH:mm" : "hh:mm a";

  const carouselRef = useRef<HTMLDivElement>(null);

  // Local "pending" time so tapping a slot only highlights it. The booking only
  // advances once the user presses the big sticky "Continuar" button.
  const [pendingTime, setPendingTime] = useState<string | null>(selectedTimeslot);

  // Keep the highlight in sync if the timeslot changes elsewhere (e.g. query param).
  useEffect(() => {
    if (selectedTimeslot) setPendingTime(selectedTimeslot);
  }, [selectedTimeslot]);

  const scheduleData = schedule?.data;
  const availableDays = useMemo(
    () => getNonEmptyScheduleDays(scheduleData?.slots).filter((d) => dayjs(d).isAfter(dayjs(), "day") || dayjs(d).isSame(dayjs(), "day")),
    [scheduleData?.slots]
  );

  // Auto-select the first available day so the user always sees times.
  useEffect(() => {
    if (isLoading) return;
    if (availableDays.length === 0) return;
    if (!selectedDate || !availableDays.includes(selectedDate)) {
      setSelectedDate({ date: availableDays[0] });
    }
  }, [isLoading, availableDays, selectedDate, setSelectedDate]);

  const daySlots = useMemo(() => {
    if (!selectedDate || !scheduleData?.slots?.[selectedDate]) return [];
    return scheduleData.slots[selectedDate].filter((slot) => !(slot?.away && !slot.toUser));
  }, [scheduleData?.slots, selectedDate]);

  const scrollCarousel = (direction: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.7, 200), behavior: "smooth" });
  };

  const handleContinue = () => {
    if (!pendingTime) return;
    onTimeSelect(pendingTime);
    if (skipConfirmStep) onSubmit(pendingTime);
  };

  const eventData = event.data;
  const doctorName = eventData?.profile?.name || eventData?.subsetOfUsers?.[0]?.name || "";
  const doctorImage = eventData?.profile?.image || eventData?.subsetOfUsers?.[0]?.avatarUrl || undefined;
  const specialty = eventData?.title || "";

  const isBooking = bookerState === "booking";
  const stepNumber = isBooking ? 2 : 1;

  const selectedDayLabel = selectedDate
    ? `${DOW[dayjs(selectedDate).day()]} ${dayjs(selectedDate).format("DD")}`
    : "";

  return (
    <div style={styles.page}>
      <style>{scopedCss}</style>
      <div style={styles.container}>
        {/* 1. Header: doctor photo + name + specialty */}
        <header style={styles.header}>
          {doctorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctorImage} alt={doctorName} style={styles.avatar} />
          ) : (
            <div style={{ ...styles.avatar, ...styles.avatarFallback }}>
              {doctorName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={styles.doctorName}>{doctorName}</div>
            {specialty ? <div style={styles.specialty}>{specialty}</div> : null}
          </div>
        </header>

        {/* Progress indicator (paso X de 3) */}
        <div style={styles.progressWrap} aria-label={`Paso ${stepNumber} de 3`}>
          <div style={styles.progressText}>Paso {stepNumber} de 3</div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${(stepNumber / 3) * 100}%` }} />
          </div>
        </div>

        {isBooking ? (
          // Confirmation step uses the standard, fully-wired Cal.com form.
          <div style={styles.formWrap}>{bookEventForm}</div>
        ) : (
          <>
            {/* 2. Title */}
            <h1 style={styles.title}>Selecciona el día y hora para tu cita</h1>

            {/* 3. Day carousel with big chevrons */}
            <div style={styles.carouselRow}>
              <button
                type="button"
                aria-label="Ver días anteriores"
                style={styles.chevron}
                onClick={() => scrollCarousel(-1)}>
                <Chevron direction="left" />
              </button>

              <div ref={carouselRef} className="sb-carousel" style={styles.carousel}>
                {isLoading ? (
                  <div style={styles.loadingText}>Cargando días…</div>
                ) : availableDays.length === 0 ? (
                  <div style={styles.loadingText}>No hay días disponibles</div>
                ) : (
                  availableDays.map((day) => {
                    const d = dayjs(day);
                    const isSelected = day === selectedDate;
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => setSelectedDate({ date: day })}
                        aria-pressed={isSelected}
                        style={{
                          ...styles.dayCard,
                          ...(isSelected ? styles.dayCardSelected : {}),
                        }}>
                        <span
                          style={{
                            ...styles.dayDow,
                            ...(isSelected ? { color: COLORS.accentDark } : {}),
                          }}>
                          {DOW[d.day()]}
                        </span>
                        <span
                          style={{
                            ...styles.dayNum,
                            ...(isSelected ? { fontSize: 40 } : {}),
                          }}>
                          {d.format("DD")}
                        </span>
                        <span style={styles.dayMonth}>{MONTHS[d.month()]}</span>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                aria-label="Ver días siguientes"
                style={styles.chevron}
                onClick={() => scrollCarousel(1)}>
                <Chevron direction="right" />
              </button>
            </div>

            {/* 4. Times section */}
            <h2 style={styles.sectionTitle}>
              Horarios disponibles{selectedDayLabel ? ` para ${selectedDayLabel}` : ""}
            </h2>

            {/* 5. Time grid (2 columns) */}
            {isLoading ? (
              <div style={styles.loadingText}>Cargando horarios…</div>
            ) : daySlots.length === 0 ? (
              <div style={styles.emptyTimes}>No hay horarios disponibles para este día.</div>
            ) : (
              <div style={styles.timeGrid}>
                {daySlots.map((slot) => {
                  const isSelected = pendingTime === slot.time;
                  const label = dayjs.utc(slot.time).tz(timezone).format(slotFormat);
                  return (
                    <button
                      type="button"
                      key={slot.time}
                      onClick={() => setPendingTime(slot.time)}
                      aria-pressed={isSelected}
                      style={{
                        ...styles.timeButton,
                        ...(isSelected ? styles.timeButtonSelected : {}),
                      }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Spacer so sticky bar never covers the last row */}
            <div style={{ height: pendingTime ? 120 : 40 }} />
          </>
        )}
      </div>

      {/* 6. Sticky "Continuar" button (shown once an hour is selected) */}
      {!isBooking && pendingTime ? (
        <div style={styles.stickyBar}>
          <button type="button" style={styles.continueButton} onClick={handleContinue}>
            Continuar
          </button>
        </div>
      ) : null}

      {/* Floating help button */}
      <a
        href="https://wa.me/?text=Hola,%20necesito%20ayuda%20para%20agendar%20mi%20cita"
        target="_blank"
        rel="noreferrer"
        style={styles.helpButton}
        aria-label="¿Necesitas ayuda?">
        <span aria-hidden="true" style={{ fontSize: 22 }}>
          ?
        </span>
        <span>¿Necesitas ayuda?</span>
      </a>
    </div>
  );
};

const Chevron = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    {direction === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);

// Hide scrollbar on the carousel + enable nice momentum swipe on mobile.
const scopedCss = `
.sb-carousel { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.sb-carousel::-webkit-scrollbar { display: none; }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: FONT_STACK,
    background: COLORS.bg,
    color: COLORS.text,
    minHeight: "100vh",
    width: "100%",
    colorScheme: "light",
    paddingBottom: 24,
  },
  container: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "20px 16px 0",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 18px",
    background: COLORS.surface,
    border: `2px solid ${COLORS.border}`,
    borderRadius: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: `3px solid ${COLORS.accent}`,
  },
  avatarFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: COLORS.accentSoft,
    color: COLORS.accentDark,
    fontSize: 32,
    fontWeight: 700,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.15,
    color: COLORS.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  specialty: {
    fontSize: 18,
    color: COLORS.textSoft,
    marginTop: 4,
  },
  progressWrap: {
    marginTop: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.textSoft,
    marginBottom: 8,
  },
  progressTrack: {
    height: 10,
    background: "#E5E3DC",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: COLORS.accent,
    borderRadius: 999,
    transition: "width .2s ease",
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1.25,
    margin: "24px 0 16px",
    color: COLORS.text,
  },
  carouselRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 8,
  },
  chevron: {
    flexShrink: 0,
    width: 56,
    minHeight: 100,
    border: `2px solid ${COLORS.border}`,
    background: COLORS.surface,
    borderRadius: 14,
    color: COLORS.accentDark,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  carousel: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    flex: 1,
    padding: "4px 2px",
  },
  dayCard: {
    flex: "0 0 auto",
    width: 84,
    minHeight: 100,
    scrollSnapAlign: "center",
    background: COLORS.surface,
    border: `2px solid ${COLORS.border}`,
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    cursor: "pointer",
    padding: "8px 4px",
  },
  dayCardSelected: {
    background: COLORS.accentSoft,
    border: `4px solid ${COLORS.accent}`,
  },
  dayDow: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.textSoft,
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
    color: COLORS.text,
  },
  dayMonth: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.textSoft,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 800,
    margin: "28px 0 16px",
    color: COLORS.text,
  },
  timeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  timeButton: {
    minHeight: 74,
    fontSize: 23,
    fontWeight: 700,
    color: COLORS.text,
    background: COLORS.surface,
    border: `2px solid ${COLORS.border}`,
    borderRadius: 14,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  timeButtonSelected: {
    background: COLORS.accent,
    border: `2px solid ${COLORS.accentDark}`,
    color: "#FFFFFF",
  },
  emptyTimes: {
    fontSize: 18,
    color: COLORS.textSoft,
    padding: "20px 4px",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.textSoft,
    padding: "20px 4px",
  },
  formWrap: {
    marginTop: 16,
    background: COLORS.surface,
    border: `2px solid ${COLORS.border}`,
    borderRadius: 18,
    padding: 16,
  },
  stickyBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "14px 16px calc(14px + env(safe-area-inset-bottom))",
    background: "rgba(250,249,245,0.97)",
    borderTop: `2px solid ${COLORS.border}`,
    zIndex: 50,
  },
  continueButton: {
    display: "block",
    width: "100%",
    maxWidth: 520,
    margin: "0 auto",
    minHeight: 70,
    fontSize: 24,
    fontWeight: 800,
    color: "#FFFFFF",
    background: COLORS.accent,
    border: "none",
    borderRadius: 16,
    cursor: "pointer",
  },
  helpButton: {
    position: "fixed",
    right: 16,
    bottom: 96,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    minHeight: 56,
    background: "#3B82F6",
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: 700,
    borderRadius: 999,
    textDecoration: "none",
    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
    zIndex: 49,
  },
};
