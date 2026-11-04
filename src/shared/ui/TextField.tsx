import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { colors, radii, sizes, spacing, typography } from '@/shared/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  /** Shows "n / max" beneath the field when `maxLength` is set. */
  readonly showCount?: boolean;
  /** Content rendered inside the field after the input, e.g. a visibility toggle. */
  readonly trailing?: ReactNode;
  readonly ref?: Ref<TextInputInstance>;
}

export function TextField({
  label,
  required = false,
  error,
  showCount = false,
  trailing,
  ref,
  multiline,
  maxLength,
  value,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <AppText variant="subhead" tone="secondary" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {label}
          {required ? <AppText variant="subhead" tone="danger"> *</AppText> : null}
        </AppText>
      </View>

      <View style={[styles.field, multiline && styles.fieldMultiline, focused && styles.fieldFocused, error !== undefined && styles.fieldError]}>
        <TextInput
          {...inputProps}
          ref={ref}
          value={value}
          multiline={multiline}
          maxLength={maxLength}
          accessibilityLabel={required ? `${label}, required` : label}
          accessibilityHint={error}
          placeholderTextColor={colors.textPlaceholder}
          selectionColor={colors.accent}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {trailing}
      </View>

      <View style={styles.footer}>
        {error !== undefined ? (
          <View style={styles.message} accessibilityLiveRegion="polite">
            <Icon name="alert-circle" size={sizes.iconSm} color={colors.danger} />
            <AppText variant="footnote" tone="danger" style={styles.messageText}>
              {error}
            </AppText>
          </View>
        ) : (
          <View style={styles.messageText} />
        )}
        {showCount && maxLength !== undefined ? (
          <AppText variant="footnote" tone="tertiary" accessibilityLabel={`${value?.length ?? 0} of ${maxLength} characters`}>
            {value?.length ?? 0}/{maxLength}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.inputHeight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  fieldMultiline: {
    alignItems: 'flex-start',
    minHeight: 112,
    paddingVertical: spacing.md,
  },
  fieldFocused: {
    borderColor: colors.accent,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  inputMultiline: {
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: 18,
  },
  message: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  messageText: {
    flex: 1,
  },
});
