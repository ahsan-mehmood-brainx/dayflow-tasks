import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { addDays, calendarDateToLocalDate, toCalendarDate, type CalendarDate } from '@/shared/lib/calendarDate';
import { colors, radii, sizes, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Chip } from '@/shared/ui/Chip';
import { Icon } from '@/shared/ui/Icon';

import { formatDueDate } from '../formatting';

interface DueDatePickerProps {
  readonly value: CalendarDate | null;
  readonly onChange: (value: CalendarDate | null) => void;
  readonly today: CalendarDate;
  /** Earliest selectable day in the calendar. */
  readonly minimumDate: CalendarDate;
  readonly error?: string;
}

/**
 * Quick choices for the common cases, plus the platform's native calendar for anything else:
 * an inline calendar on iOS, the system dialog on Android.
 */
export function DueDatePicker({ value, onChange, today, minimumDate, error }: DueDatePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const quickOptions = [
    { label: 'No date', value: null },
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next week', value: addDays(today, 7) },
  ] as const;
  const isCustom = value !== null && !quickOptions.some((option) => option.value === value);
  const pickerValue = calendarDateToLocalDate(value ?? today) ?? new Date();
  const minimum = calendarDateToLocalDate(minimumDate) ?? undefined;
  const supportsCalendar = Platform.OS === 'ios' || Platform.OS === 'android';

  const openCalendar = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'date',
        minimumDate: minimum,
        onValueChange: (_event, date) => onChange(toCalendarDate(date)),
      });
    } else {
      setCalendarOpen((open) => !open);
    }
  };

  return (
    <View style={styles.container}>
      <AppText variant="subhead" tone="secondary" accessibilityRole="header">
        Due date
      </AppText>

      <View accessibilityRole="radiogroup" accessibilityLabel="Due date" style={styles.chips}>
        {quickOptions.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={option.value === value}
            onPress={() => {
              setCalendarOpen(false);
              onChange(option.value);
            }}
          />
        ))}
        {supportsCalendar ? (
          <Chip
            label={isCustom ? formatDueDate(value, today) : 'Pick a date'}
            icon="calendar-outline"
            selected={isCustom}
            onPress={openCalendar}
            accessibilityHint="Opens a calendar"
          />
        ) : null}
      </View>

      {Platform.OS === 'ios' && calendarOpen ? (
        <View style={styles.calendar}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="inline"
            minimumDate={minimum}
            themeVariant="light"
            accentColor={colors.accent}
            onValueChange={(_event, date) => onChange(toCalendarDate(date))}
          />
        </View>
      ) : null}

      <View style={styles.summary}>
        <Icon name={error ? 'alert-circle' : 'calendar-outline'} size={sizes.iconSm} color={error ? colors.danger : colors.textTertiary} />
        <AppText variant="footnote" tone={error ? 'danger' : 'tertiary'} accessibilityLiveRegion="polite">
          {error ?? (value === null ? 'No due date' : `Due ${formatDueDate(value, today)}`)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  calendar: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
