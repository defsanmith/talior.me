import { format, isValid, parseISO } from "date-fns";

type DateValue = Date | string | null | undefined;

const DISPLAY_FALLBACK = "-";
const DATE_INPUT_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "MMM d, yyyy";

function parseDateValue(date: DateValue): Date | null {
  if (!date) return null;

  const parsedDate = date instanceof Date ? date : parseISO(date);
  return isValid(parsedDate) ? parsedDate : null;
}

export function formatApplicationDate(date: DateValue): string {
  const parsedDate = parseDateValue(date);
  if (!parsedDate) return DISPLAY_FALLBACK;

  return format(parsedDate, DISPLAY_FORMAT);
}

export function toApplicationDateInputValue(date: DateValue): string {
  const parsedDate = parseDateValue(date);
  if (!parsedDate) return "";

  return format(parsedDate, DATE_INPUT_FORMAT);
}

export function toApplicationDatePickerValue(
  date: DateValue,
): Date | undefined {
  return parseDateValue(date) ?? undefined;
}

export function toMiddayUtcApplicationDateIso(dateValue: string): string {
  const parsedDate = parseISO(`${dateValue}T12:00:00.000Z`);
  return parsedDate.toISOString();
}

export function toMiddayUtcApplicationDateIsoFromDate(date: Date): string {
  return toMiddayUtcApplicationDateIso(format(date, DATE_INPUT_FORMAT));
}
